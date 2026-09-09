import { getDb, withWriteTransaction } from './client';
import { uid } from '@/lib/id';
import { recordStudyOnDb, type StudyRecordInput } from './progress';

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

/** Atomically persist quiz details and matching daily progress. */
export async function completeQuizSession(
  input: QuizSessionInput,
  progress: StudyRecordInput,
): Promise<string> {
  const db = await getDb();
  const sessionId = uid('quiz_');
  await withWriteTransaction(db, async (tx) => {
    await tx.runAsync(
      'INSERT INTO quiz_sessions (id, board, subject, mode, total, correct, duration_seconds, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sessionId, input.board, input.subject, input.mode, input.total, input.correct, input.durationSeconds, Date.now()],
    );
    for (const answer of input.answers) {
      await tx.runAsync(
        'INSERT INTO quiz_answers (id, session_id, flashcard_id, question, user_answer, correct_answer, is_correct, time_taken_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uid('ans_'), sessionId, answer.flashcardId ?? null, answer.question, answer.userAnswer, answer.correctAnswer, answer.isCorrect ? 1 : 0, answer.timeTakenMs],
      );
    }
    await recordStudyOnDb(tx, progress);
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
