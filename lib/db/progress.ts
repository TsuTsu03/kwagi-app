import { getDb } from './client';

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

function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Increment today's stats. Used by quiz + flashcard sessions. */
export async function recordStudy(input: {
  cardsStudied?: number;
  questionsAnswered?: number;
  correctAnswers?: number;
  studySeconds?: number;
  xp?: number;
}): Promise<void> {
  const db = await getDb();
  const date = todayKey();
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

export async function getToday(): Promise<DailyStat> {
  const db = await getDb();
  const date = todayKey();
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
  if (active.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  // Allow the streak to still count if today hasn't been logged yet.
  if (!active.has(todayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!active.has(todayKey(cursor))) return 0;
  }

  while (active.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
