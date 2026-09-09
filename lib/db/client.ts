import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { SCHEMA_SQL } from './schema';
import { uid } from '@/lib/id';

const DB_NAME = 'kwagi.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Use an isolated native connection; Expo web currently supports only the standard transaction API. */
export async function withWriteTransaction(
  db: SQLite.SQLiteDatabase,
  task: (tx: SQLite.SQLiteDatabase) => Promise<void>,
): Promise<void> {
  if (Platform.OS === 'web') return db.withTransactionAsync(() => task(db));
  // Expo's exclusive helper opens a new connection, where foreign_keys defaults
  // to OFF. Set it before BEGIN; changing it inside a transaction has no effect.
  const separator = db.databasePath.lastIndexOf('/');
  const name = separator >= 0 ? db.databasePath.slice(separator + 1) : DB_NAME;
  const directory = separator >= 0 ? db.databasePath.slice(0, separator) : undefined;
  const tx = await SQLite.openDatabaseAsync(name, { ...db.options, useNewConnection: true }, directory);
  try {
    await tx.execAsync('PRAGMA foreign_keys = ON;');
    await tx.withTransactionAsync(() => task(tx));
  } finally {
    await tx.closeAsync();
  }
}

/** Lazily open (and initialize) the single app database. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const previousVersion = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      await db.execAsync(SCHEMA_SQL);
      await migrate(db);
      // An intentionally empty library must stay empty after a cold start.
      if ((previousVersion?.user_version ?? 0) === 0) await seedIfEmpty(db);
      return db;
    })().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = version?.user_version ?? 0;
  if (currentVersion >= 3) return;

  await withWriteTransaction(db, async (tx) => {
    if (currentVersion < 2) {
      const columns = await tx.getAllAsync<{ name: string }>('PRAGMA table_info(flashcards)');
      const names = new Set(columns.map((column) => column.name));
      if (!names.has('suspended')) {
        await tx.execAsync('ALTER TABLE flashcards ADD COLUMN suspended INTEGER DEFAULT 0;');
      }
      if (!names.has('updated_at')) {
        await tx.execAsync('ALTER TABLE flashcards ADD COLUMN updated_at INTEGER;');
      }
    }
    if (currentVersion < 3) {
      await tx.execAsync('DROP TABLE IF EXISTS chat_messages;');
    }
    await tx.execAsync('PRAGMA user_version = 3;');
  });
}

/** Seed course-neutral starter content on first launch only. */
async function seedIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM subjects',
  );
  if (row && row.count > 0) return;

  const now = Date.now();

  const subjectId = uid('subj_');
  const noteId = uid('note_');

  await withWriteTransaction(db, async (tx) => {
    await tx.runAsync(
      'INSERT INTO subjects (id, name, board, color, icon, created_at) VALUES (?, ?, NULL, ?, ?, ?)',
      [subjectId, 'Study Skills', '#2DD4BF', 'library', now],
    );
    await tx.runAsync(
      'INSERT INTO notes (id, subject_id, title, content, tags, linked_note_ids, pinned, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
      [
        noteId,
        subjectId,
        'How to use Kwagi',
        'Keep one subject per class. Write concise notes, then turn key facts into cards. Review due cards daily and use Quiz to test recall.\n\nCard format examples:\nActive recall :: Try to answer before checking the back.\nSpacing effect :: Learning improves when reviews are spread over time.\n\n#study #starter',
        JSON.stringify(['study', 'starter']),
        JSON.stringify([]),
        now,
        now,
      ],
    );

    const starterCards = [
      ['What is active recall?', 'Trying to retrieve an answer before checking your notes.'],
      ['What is spaced repetition?', 'Reviewing material at increasing intervals over time.'],
      ['What makes a useful flashcard?', 'One clear question with one focused answer.'],
      ['Why mix practice questions?', 'Interleaving helps you choose the right method, not only repeat one pattern.'],
      ['What should you do after a wrong answer?', 'Check why it was wrong, correct the idea, then test it again later.'],
    ];
    for (const [front, back] of starterCards) {
      await tx.runAsync(
        'INSERT INTO flashcards (id, note_id, subject_id, front, back, board, subject, interval, ease_factor, repetitions, next_review, suspended, updated_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, 1, 2.5, 0, ?, 0, ?, ?)',
        [
          uid('card_'),
          noteId,
          subjectId,
          front,
          back,
          'Study Skills',
          now,
          now,
          now,
        ],
      );
    }
  });
}

/** Test/debug helper — wipes all rows. */
export async function clearAllData(reseed = true): Promise<void> {
  const db = await getDb();
  await withWriteTransaction(db, async (tx) => {
    await tx.execAsync(`
      DELETE FROM quiz_answers;
      DELETE FROM quiz_sessions;
      DELETE FROM flashcards;
      DELETE FROM notes;
      DELETE FROM subjects;
      DELETE FROM daily_stats;
    `);
  });
  if (reseed) await seedIfEmpty(db);
}
