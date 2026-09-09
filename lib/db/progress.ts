import type * as SQLite from 'expo-sqlite';
import { getDb } from './client';
import { calculateStreak, localDateKey } from '@/lib/date';

export interface DailyStat {
  date: string; // YYYY-MM-DD
  cards_studied: number;
  questions_answered: number;
  correct_answers: number;
  study_time_seconds: number;
  xp_earned: number;
}

export interface ProgressTotals {
  totalCardsStudied: number;
  totalQuestions: number;
  totalCorrect: number;
  totalStudySeconds: number;
  totalXp: number;
  accuracy: number; // 0..100
}

/** Increment today's stats. Used by quiz + flashcard sessions. */
export interface StudyRecordInput {
  cardsStudied?: number;
  questionsAnswered?: number;
  correctAnswers?: number;
  studySeconds?: number;
  xp?: number;
}

export async function recordStudyOnDb(db: SQLite.SQLiteDatabase, input: StudyRecordInput): Promise<void> {
  const date = localDateKey();
  await db.runAsync(
    `INSERT INTO daily_stats (date, cards_studied, questions_answered, correct_answers, study_time_seconds, xp_earned)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       cards_studied = cards_studied + excluded.cards_studied,
       questions_answered = questions_answered + excluded.questions_answered,
       correct_answers = correct_answers + excluded.correct_answers,
       study_time_seconds = study_time_seconds + excluded.study_time_seconds,
       xp_earned = xp_earned + excluded.xp_earned`,
    [
      date,
      input.cardsStudied ?? 0,
      input.questionsAnswered ?? 0,
      input.correctAnswers ?? 0,
      input.studySeconds ?? 0,
      input.xp ?? 0,
    ],
  );
}

export async function recordStudy(input: StudyRecordInput): Promise<void> {
  const db = await getDb();
  await recordStudyOnDb(db, input);
}

export async function getToday(): Promise<DailyStat> {
  const db = await getDb();
  const date = localDateKey();
  const row = await db.getFirstAsync<DailyStat>('SELECT * FROM daily_stats WHERE date = ?', [date]);
  return (
    row ?? {
      date,
      cards_studied: 0,
      questions_answered: 0,
      correct_answers: 0,
      study_time_seconds: 0,
      xp_earned: 0,
    }
  );
}

export async function getTotals(): Promise<ProgressTotals> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    cards: number;
    questions: number;
    correct: number;
    seconds: number;
    xp: number;
  }>(`
    SELECT
      COALESCE(SUM(cards_studied), 0) AS cards,
      COALESCE(SUM(questions_answered), 0) AS questions,
      COALESCE(SUM(correct_answers), 0) AS correct,
      COALESCE(SUM(study_time_seconds), 0) AS seconds,
      COALESCE(SUM(xp_earned), 0) AS xp
    FROM daily_stats
  `);
  const questions = row?.questions ?? 0;
  const correct = row?.correct ?? 0;
  return {
    totalCardsStudied: row?.cards ?? 0,
    totalQuestions: questions,
    totalCorrect: correct,
    totalStudySeconds: row?.seconds ?? 0,
    totalXp: row?.xp ?? 0,
    accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
  };
}

/**
 * Last `n` days of stats ending today, oldest first. Days with no row come
 * back zero-filled so charts always have a full window.
 */
export async function getRecentDays(n = 7): Promise<DailyStat[]> {
  const db = await getDb();
  const keys: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    keys.push(localDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const placeholders = keys.map(() => '?').join(', ');
  const rows = await db.getAllAsync<DailyStat>(
    `SELECT * FROM daily_stats WHERE date IN (${placeholders})`,
    keys,
  );
  const byDate = new Map(rows.map((r) => [r.date, r]));
  return keys.map(
    (date) =>
      byDate.get(date) ?? {
        date,
        cards_studied: 0,
        questions_answered: 0,
        correct_answers: 0,
        study_time_seconds: 0,
        xp_earned: 0,
      },
  );
}

/** All dates (YYYY-MM-DD) with any study activity, for streak + heatmap. */
export async function getActiveDates(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT date FROM daily_stats WHERE (cards_studied + questions_answered) > 0',
  );
  return new Set(rows.map((r) => r.date));
}

/** Current consecutive-day streak ending today (or yesterday). */
export async function getStreak(): Promise<number> {
  const active = await getActiveDates();
  return calculateStreak(active);
}
