import type { Settings } from './storage/settings';

export const BACKUP_TABLES = ['subjects', 'notes', 'flashcards', 'quiz_sessions', 'quiz_answers', 'daily_stats'] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];
export const BACKUP_COLUMNS: Record<BackupTable, string[]> = {
  subjects: ['id', 'name', 'board', 'color', 'icon', 'created_at'],
  notes: ['id', 'subject_id', 'title', 'content', 'tags', 'linked_note_ids', 'pinned', 'updated_at', 'created_at'],
  flashcards: ['id', 'note_id', 'subject_id', 'front', 'back', 'board', 'subject', 'interval', 'ease_factor', 'repetitions', 'next_review', 'suspended', 'updated_at', 'created_at'],
  quiz_sessions: ['id', 'board', 'subject', 'mode', 'total', 'correct', 'duration_seconds', 'completed_at'],
  quiz_answers: ['id', 'session_id', 'flashcard_id', 'question', 'user_answer', 'correct_answer', 'is_correct', 'time_taken_ms'],
  daily_stats: ['date', 'cards_studied', 'questions_answered', 'correct_answers', 'study_time_seconds', 'xp_earned'],
};

export interface KwagiBackup {
  format: 'kwagi-backup';
  version: 1;
  exportedAt: string;
  settings: Settings;
  data: Record<BackupTable, Record<string, string | number | null>[]>;
}

function fail(message: string): never { throw new Error(message); }
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function choice(value: unknown, allowed: string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}
function stringList(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string'); }
  catch { return false; }
}
function validDateKey(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validate the complete document before any local data is opened or replaced. */
export function parseBackup(raw: string): KwagiBackup {
  if (raw.length > 10_000_000) fail('This backup exceeds the 10 MB text limit.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { fail('Paste a complete JSON backup exported by Kwagi.'); }
  if (!object(value) || value.format !== 'kwagi-backup' || value.version !== 1 || !object(value.data) || !object(value.settings)) {
    fail('This is not a supported Kwagi backup.');
  }
  if (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) fail('The backup export date is invalid.');
  const settings = value.settings;
  if (!['studentName', 'course', 'yearLevel'].every((key) => typeof settings[key] === 'string')
    || typeof settings.onboardingComplete !== 'boolean'
    || !nonnegative(settings.dailyGoal) || settings.dailyGoal < 1
    || !choice(settings.animationPreference, ['system', 'on', 'off'])
    || !choice(settings.dialogueLanguage, ['taglish', 'filipino', 'english'])
    || !choice(settings.themePref, ['light', 'dark', 'system'])
    || (settings.lastStudyAt !== null && !nonnegative(settings.lastStudyAt))) {
    fail('The backup contains invalid or missing preferences.');
  }

  const ids = new Map<BackupTable, Set<string>>();
  let rowCount = 0;
  for (const table of BACKUP_TABLES) {
    const rows = value.data[table];
    if (!Array.isArray(rows)) fail(`The backup is incomplete: ${table} is missing.`);
    rowCount += rows.length;
    if (rowCount > 100_000) fail('This backup contains too many records.');
    const seen = new Set<string>();
    ids.set(table, seen);
    for (const row of rows) {
      if (!object(row) || BACKUP_COLUMNS[table].some((column) => !Object.hasOwn(row, column))) fail(`A ${table} record is incomplete.`);
      const key = table === 'daily_stats' ? row.date : row.id;
      if (typeof key !== 'string' || !key.trim() || seen.has(key)) fail(`The backup contains an invalid or duplicate ${table} ID.`);
      seen.add(key);
      for (const column of BACKUP_COLUMNS[table]) {
        const field = row[column];
        if (field !== null && typeof field !== 'string' && typeof field !== 'number') fail(`Invalid ${table}.${column} value.`);
        if (typeof field === 'number' && !Number.isFinite(field)) fail(`Invalid ${table}.${column} number.`);
      }
      const requiredText = table === 'subjects' ? ['name'] : table === 'notes' ? ['title'] : table === 'flashcards' ? ['front', 'back'] : [];
      if (requiredText.some((column) => typeof row[column] !== 'string' || !(row[column] as string).trim())) fail(`A ${table} record has empty study content.`);
      const numericColumns = BACKUP_COLUMNS[table].filter((column) => ['created_at', 'updated_at', 'next_review', 'interval', 'repetitions', 'total', 'correct', 'duration_seconds', 'completed_at', 'time_taken_ms', 'cards_studied', 'questions_answered', 'correct_answers', 'study_time_seconds', 'xp_earned'].includes(column));
      if (numericColumns.some((column) => !nonnegative(row[column]) && !(column === 'updated_at' && table === 'flashcards' && row[column] === null))) fail(`A ${table} record has an invalid date or count.`);
      const numericFields = new Set([...numericColumns, 'ease_factor', 'pinned', 'suspended', 'is_correct']);
      if (BACKUP_COLUMNS[table].some((column) => !numericFields.has(column) && row[column] !== null && typeof row[column] !== 'string')) fail(`A ${table} record has invalid text.`);
      for (const column of ['pinned', 'suspended', 'is_correct']) {
        if (BACKUP_COLUMNS[table].includes(column) && row[column] !== 0 && row[column] !== 1) fail(`Invalid ${table}.${column} value.`);
      }
      if (table === 'notes' && (!stringList(row.tags) || !stringList(row.linked_note_ids))) fail('A note contains invalid tags or links.');
      if (table === 'quiz_answers' && (typeof row.session_id !== 'string' || !row.session_id.trim())) fail('A quiz answer is missing its session.');
      if (table === 'flashcards' && (typeof row.ease_factor !== 'number' || row.ease_factor < 1.3 || (row.interval as number) < 1)) fail('A card contains an invalid review schedule.');
      if (table === 'quiz_sessions' && (!['practice', 'mock_exam', 'weak_spots', 'flashcards'].includes(String(row.mode)) || (row.correct as number) > (row.total as number))) fail('A quiz contains invalid results.');
      if (table === 'daily_stats' && (!validDateKey(row.date) || (row.correct_answers as number) > (row.questions_answered as number))) fail('A daily progress record is invalid.');
    }
  }
  for (const table of BACKUP_TABLES) {
    for (const row of value.data[table] as Record<string, unknown>[]) {
      for (const [column, parent] of [['subject_id', 'subjects'], ['note_id', 'notes'], ['session_id', 'quiz_sessions']] as const) {
        if (BACKUP_COLUMNS[table].includes(column) && row[column] !== null && !ids.get(parent)?.has(row[column] as string)) fail(`A ${table} record refers to a missing ${parent} record.`);
      }
    }
  }
  return value as unknown as KwagiBackup;
}
