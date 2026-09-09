/** SQLite DDL. Executed once on first launch (idempotent via IF NOT EXISTS). */
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  board TEXT,
  color TEXT,
  icon TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT,
  linked_note_ids TEXT,
  pinned INTEGER DEFAULT 0,
  updated_at INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  board TEXT,
  subject TEXT,
  interval INTEGER DEFAULT 1,
  ease_factor REAL DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  next_review INTEGER,
  suspended INTEGER DEFAULT 0,
  updated_at INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  board TEXT,
  subject TEXT,
  mode TEXT,
  total INTEGER,
  correct INTEGER,
  duration_seconds INTEGER,
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  flashcard_id TEXT,
  question TEXT,
  user_answer TEXT,
  correct_answer TEXT,
  is_correct INTEGER,
  time_taken_ms INTEGER
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,
  cards_studied INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  study_time_seconds INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due ON flashcards(next_review);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_board ON flashcards(board);
CREATE INDEX IF NOT EXISTS idx_answers_session ON quiz_answers(session_id);
`;
