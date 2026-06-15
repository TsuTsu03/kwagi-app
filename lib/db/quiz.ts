import { getDb } from './client';
import { uid } from '@/lib/id';

export interface QuizAnswerInput {
  flashcardId?: string | null;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface QuizSessionInput {
  board: string | null;
  subject: string | null;
  mode: 'practice' | 'mock_exam' | 'weak_spots' | 'flashcards';
  total: number;
  correct: number;
  durationSeconds: number;
  answers: QuizAnswerInput[];
}

/** Persist a finished quiz session plus its per-question answers. */
export async function saveQuizSession(input: QuizSessionInput): Promise<string> {
  const db = await getDb();
  const sessionId = uid('quiz_');
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO quiz_sessions (id, board, subject, mode, total, correct, duration_seconds, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sessionId,
        input.board,
        input.subject,
        input.mode,
        input.total,
        input.correct,
        input.durationSeconds,
        Date.now(),
      ],
    );
    for (const a of input.answers) {
      await db.runAsync(
        'INSERT INTO quiz_answers (id, session_id, flashcard_id, question, user_answer, correct_answer, is_correct, time_taken_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          uid('ans_'),
          sessionId,
          a.flashcardId ?? null,
          a.question,
          a.userAnswer,
          a.correctAnswer,
          a.isCorrect ? 1 : 0,
          a.timeTakenMs,
        ],
      );
    }
  });
  return sessionId;
}

export async function countSessions(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM quiz_sessions',
  );
  return row?.count ?? 0;
}
