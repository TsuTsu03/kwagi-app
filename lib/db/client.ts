import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { SEED_QUESTIONS } from '@/constants/questions';
import { uid } from '@/lib/id';

const DB_NAME = 'kwagi.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Lazily open (and initialize) the single app database. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(SCHEMA_SQL);
      await seedIfEmpty(db);
      return db;
    })();
  }
  return dbPromise;
}

/** Seed sample subjects, notes, and flashcards on first launch only. */
async function seedIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM subjects',
  );
  if (row && row.count > 0) return;

  const now = Date.now();

  // `icon` stores an Ionicons glyph name (never an emoji) — matches the board
  // icons in constants/boards.ts so seeded and user-created subjects render
  // through the same <Ionicons> path.
  const sampleSubjects = [
    { name: 'Nursing Fundamentals', board: 'NLE', color: '#2DD4BF', icon: 'medkit' },
    { name: 'Electronics Basics', board: 'ECE', color: '#F5A623', icon: 'hardware-chip' },
    { name: 'Accounting 101', board: 'CPA', color: '#A78BFA', icon: 'calculator' },
  ];

  const subjectIds: Record<string, string> = {};

  await db.withTransactionAsync(async () => {
    for (const s of sampleSubjects) {
      const id = uid('subj_');
      subjectIds[s.board] = id;
      await db.runAsync(
        'INSERT INTO subjects (id, name, board, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, s.name, s.board, s.color, s.icon, now],
      );
    }

    const sampleNotes = [
      {
        board: 'NLE',
        title: 'Vital Signs Cheat Sheet',
        content:
          'Normal adult ranges:\n- Temp: 36.5–37.5°C\n- Pulse: 60–100 bpm\n- Respiration: 12–20 /min\n- BP: 120/80 mmHg\n\n#vitals #fundamentals',
        tags: JSON.stringify(['vitals', 'fundamentals']),
      },
      {
        board: 'ECE',
        title: "Ohm's Law & Power",
        content:
          'V = I × R\nP = V × I = I²R = V²/R\n\nSeries: R_total = R1 + R2 + ...\nParallel: 1/R_total = 1/R1 + 1/R2 + ...\n\n#electronics #math',
        tags: JSON.stringify(['electronics', 'math']),
      },
      {
        board: 'CPA',
        title: 'Accounting Equation',
        content:
          'Assets = Liabilities + Equity\n\nDebits increase: assets, expenses\nCredits increase: liabilities, equity, revenue\n\n#accounting #basics',
        tags: JSON.stringify(['accounting', 'basics']),
      },
    ];

    for (const n of sampleNotes) {
      await db.runAsync(
        'INSERT INTO notes (id, subject_id, title, content, tags, linked_note_ids, pinned, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
        [
          uid('note_'),
          subjectIds[n.board],
          n.title,
          n.content,
          n.tags,
          JSON.stringify([]),
          now,
          now,
        ],
      );
    }

    // Seed flashcards from the question bank so Quiz + Due for Review work day one.
    for (const q of SEED_QUESTIONS) {
      await db.runAsync(
        'INSERT INTO flashcards (id, note_id, subject_id, front, back, board, subject, interval, ease_factor, repetitions, next_review, created_at) VALUES (?, NULL, ?, ?, ?, ?, ?, 1, 2.5, 0, ?, ?)',
        [
          uid('card_'),
          subjectIds[q.board] ?? null,
          q.question,
          `${q.choices[q.answer]}\n\n${q.explanation}`,
          q.board,
          q.subject,
          now, // due immediately
          now,
        ],
      );
    }
  });
}

/** Test/debug helper — wipes all rows. */
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM quiz_answers;
    DELETE FROM quiz_sessions;
    DELETE FROM flashcards;
    DELETE FROM notes;
    DELETE FROM subjects;
    DELETE FROM daily_stats;
    DELETE FROM chat_messages;
  `);
}
