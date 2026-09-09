import { getDb, withWriteTransaction } from './client';
import { updateSrs, type SwipeAction, SWIPE_QUALITY } from '@/lib/srs';
import { uid } from '@/lib/id';
import { recordStudyOnDb } from './progress';

export interface Flashcard {
  id: string;
  note_id: string | null;
  subject_id: string | null;
  front: string;
  back: string;
  board: string | null;
  subject: string | null;
  interval: number;
  ease_factor: number;
  repetitions: number;
  next_review: number;
  suspended: number;
  updated_at: number | null;
  created_at: number;
}

export async function countDue(now = Date.now()): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM flashcards WHERE suspended = 0 AND next_review <= ?',
    [now],
  );
  return row?.count ?? 0;
}

export async function getDueCards(limit = 50, now = Date.now()): Promise<Flashcard[]> {
  const db = await getDb();
  return db.getAllAsync<Flashcard>(
    'SELECT * FROM flashcards WHERE suspended = 0 AND next_review <= ? ORDER BY next_review ASC LIMIT ?',
    [now, limit],
  );
}

export async function listByBoard(board: string, limit = 100): Promise<Flashcard[]> {
  const db = await getDb();
  return db.getAllAsync<Flashcard>(
    'SELECT * FROM flashcards WHERE board = ? ORDER BY next_review ASC LIMIT ?',
    [board, limit],
  );
}

export async function createFlashcard(input: {
  front: string;
  back: string;
  board?: string | null;
  subject?: string | null;
  subject_id?: string | null;
  note_id?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = uid('card_');
  await db.runAsync(
    'INSERT INTO flashcards (id, note_id, subject_id, front, back, board, subject, interval, ease_factor, repetitions, next_review, suspended, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 2.5, 0, ?, 0, ?, ?)',
    [
      id,
      input.note_id ?? null,
      input.subject_id ?? null,
      input.front,
      input.back,
      input.board ?? null,
      input.subject ?? null,
      Date.now(),
      Date.now(),
      Date.now(),
    ],
  );
  return id;
}

export async function listFlashcards(input: {
  subjectId?: string | null;
  includeSuspended?: boolean;
  limit?: number;
} = {}): Promise<Flashcard[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (input.subjectId) {
    where.push('subject_id = ?');
    params.push(input.subjectId);
  }
  if (!input.includeSuspended) where.push('suspended = 0');
  if (input.limit !== undefined) params.push(input.limit);
  return db.getAllAsync<Flashcard>(
    `SELECT * FROM flashcards ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY updated_at DESC, created_at DESC ${input.limit !== undefined ? 'LIMIT ?' : ''}`,
    params,
  );
}

export async function updateFlashcard(
  id: string,
  patch: { front: string; back: string; subjectId?: string; subjectName?: string },
): Promise<void> {
  const db = await getDb();
  if (patch.subjectId && patch.subjectName) {
    await db.runAsync('UPDATE flashcards SET front = ?, back = ?, note_id = CASE WHEN subject_id = ? THEN note_id ELSE NULL END, subject_id = ?, subject = ?, updated_at = ? WHERE id = ?', [
      patch.front, patch.back, patch.subjectId, patch.subjectId, patch.subjectName, Date.now(), id,
    ]);
    return;
  }
  await db.runAsync('UPDATE flashcards SET front = ?, back = ?, updated_at = ? WHERE id = ?', [
    patch.front,
    patch.back,
    Date.now(),
    id,
  ]);
}

export async function setFlashcardSuspended(id: string, suspended: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE flashcards SET suspended = ?, updated_at = ? WHERE id = ?', [
    suspended ? 1 : 0,
    Date.now(),
    id,
  ]);
}

/** Atomically update one card schedule and its daily progress. */
export async function reviewCardAndRecord(card: Flashcard, action: SwipeAction, studySeconds = 0): Promise<void> {
  const db = await getDb();
  await withWriteTransaction(db, async (tx) => {
    const current = await tx.getFirstAsync<Flashcard>('SELECT * FROM flashcards WHERE id = ? AND suspended = 0', [card.id]);
    if (!current || current.next_review > Date.now() || current.updated_at !== card.updated_at) {
      throw new Error('This card changed. Start a new review to load the latest cards.');
    }
    const next = updateSrs(
      { interval: current.interval, easeFactor: current.ease_factor, repetitions: current.repetitions },
      SWIPE_QUALITY[action],
    );
    await tx.runAsync(
      'UPDATE flashcards SET interval = ?, ease_factor = ?, repetitions = ?, next_review = ?, updated_at = ? WHERE id = ?',
      [next.interval, next.easeFactor, next.repetitions, next.nextReview, Date.now(), card.id],
    );
    await recordStudyOnDb(tx, { cardsStudied: 1, studySeconds, xp: 2 });
  });
}

export async function deleteFlashcard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM flashcards WHERE id = ?', [id]);
}
