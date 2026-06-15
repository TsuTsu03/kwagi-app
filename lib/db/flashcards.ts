import { getDb } from './client';
import { updateSrs, type SwipeAction, SWIPE_QUALITY } from '@/lib/srs';
import { uid } from '@/lib/id';

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
  created_at: number;
}

export async function countDue(now = Date.now()): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM flashcards WHERE next_review <= ?',
    [now],
  );
  return row?.count ?? 0;
}

export async function getDueCards(limit = 50, now = Date.now()): Promise<Flashcard[]> {
  const db = await getDb();
  return db.getAllAsync<Flashcard>(
    'SELECT * FROM flashcards WHERE next_review <= ? ORDER BY next_review ASC LIMIT ?',
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
    'INSERT INTO flashcards (id, note_id, subject_id, front, back, board, subject, interval, ease_factor, repetitions, next_review, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 2.5, 0, ?, ?)',
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
    ],
  );
  return id;
}

/** Apply an SM-2 update for a flashcard after a review swipe. */
export async function reviewCard(card: Flashcard, action: SwipeAction): Promise<void> {
  const db = await getDb();
  const next = updateSrs(
    {
      interval: card.interval,
      easeFactor: card.ease_factor,
      repetitions: card.repetitions,
    },
    SWIPE_QUALITY[action],
  );
  await db.runAsync(
    'UPDATE flashcards SET interval = ?, ease_factor = ?, repetitions = ?, next_review = ? WHERE id = ?',
    [next.interval, next.easeFactor, next.repetitions, next.nextReview, card.id],
  );
}

export async function deleteFlashcard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM flashcards WHERE id = ?', [id]);
}
