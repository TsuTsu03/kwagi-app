/**
 * Stress test for large imports and growing libraries.
 *
 * Runs the app's real readers, queries, and backup code (only the native SQLite transport is
 * replaced with node:sqlite) and prints timings, memory, and storage sizes per library size.
 * Node's JIT is faster than Hermes on phones, so treat timings as a lower bound.
 *
 *   npm run stress            # every scenario
 *   npm run stress -- quick   # smaller libraries only
 */
import { readFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { performance } from 'node:perf_hooks';
import { DatabaseSync } from 'node:sqlite';
import { strToU8, zipSync } from 'fflate';
import { SCHEMA_SQL } from '../lib/db/schema.ts';
import { parseBackup, BACKUP_COLUMNS, BACKUP_TABLES } from '../lib/backupValidation.ts';
import { prepareImportedText, RAW_IMPORT_CHARS } from '../lib/import/text.ts';
import { extractDocxText, extractPptxText, decodeTextFile } from '../lib/import/office.ts';
import { generateFlashcards } from '../lib/flashcardGenerator.ts';
import { buildQuiz } from '../lib/quizBuilder.ts';
import { calculateStreak, localDateKey } from '../lib/date.ts';
import { updateSrs, SWIPE_QUALITY } from '../lib/srs.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');
const quick = process.argv.includes('quick');

// ---------- reporting ----------

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const ms = (value: number) => (value < 10 ? `${value.toFixed(1)} ms` : `${Math.round(value).toLocaleString()} ms`);

function measure<T>(task: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = task();
  return { result, time: performance.now() - start };
}
async function measureAsync<T>(task: () => Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = await task();
  return { result, time: performance.now() - start };
}
function table(title: string, rows: Record<string, string | number>[]) {
  console.log(`\n## ${title}\n`);
  const headers = Object.keys(rows[0]);
  console.log(`| ${headers.join(' | ')} |`);
  console.log(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) console.log(`| ${headers.map((key) => row[key]).join(' | ')} |`);
}

// ---------- realistic content ----------

let seed = 42;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const WORDS = 'cell membrane protein enzyme energy reaction pressure volume theory evidence market demand supply law court contract equation function derivative network packet memory process history colony revolution poem symbol rhythm'.split(' ');
const word = () => WORDS[Math.floor(random() * WORDS.length)];
const sentence = (n = 12) => Array.from({ length: n }, word).join(' ');

/** Lecture-style note: prose with some Term: definition lines, about `chars` long. */
function noteText(chars: number): string {
  const lines: string[] = [];
  let length = 0;
  for (let i = 0; length < chars; i++) {
    const line = i % 6 === 0 ? `${word()} ${word()} ${i}: ${sentence(8)}` : sentence(14);
    lines.push(line);
    length += line.length + 1;
  }
  return lines.join('\n').slice(0, chars);
}

// ---------- 1. import readers ----------

function docx(bytesOfText: number) {
  const paragraphs: string[] = [];
  let size = 0;
  while (size < bytesOfText) {
    const text = sentence(16);
    paragraphs.push(`<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`);
    size += text.length;
  }
  return zipSync({ 'word/document.xml': strToU8(`<w:document><w:body>${paragraphs.join('')}</w:body></w:document>`) });
}
function pptx(slides: number) {
  const files: Record<string, Uint8Array> = {};
  for (let i = 1; i <= slides; i++) {
    const body = Array.from({ length: 8 }, () => `<a:p><a:r><a:rPr lang="en-US"/><a:t>${sentence(10)}</a:t></a:r></a:p>`).join('');
    files[`ppt/slides/slide${i}.xml`] = strToU8(`<p:sld><p:cSld><p:spTree><p:sp><p:txBody>${body}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  }
  return zipSync(files);
}

function importReaders() {
  const rows: Record<string, string>[] = [];
  const run = (name: string, fileBytes: number, read: () => string) => {
    global.gc?.();
    const heapBefore = process.memoryUsage().heapUsed;
    let extracted: { result: string; time: number };
    const start = performance.now();
    try {
      extracted = measure(read);
    } catch (error) {
      rows.push({ Input: name, 'File size': mb(fileBytes), 'Text read': '-', Read: ms(performance.now() - start), Clean: '-', 'Kept in note': `Rejected: ${(error as Error).message}`, 'Heap growth': '-' });
      return;
    }
    const cleaned = measure(() => prepareImportedText(extracted.result));
    const limited = cleaned.result;
    const heapPeak = process.memoryUsage().heapUsed;
    rows.push({
      Input: name,
      'File size': mb(fileBytes),
      'Text read': `${extracted.result.length.toLocaleString()} chars`,
      Read: ms(extracted.time),
      Clean: ms(cleaned.time),
      'Kept in note': limited.truncated ? `${limited.text.length.toLocaleString()} chars (truncated)` : `${limited.text.length.toLocaleString()} chars`,
      'Heap growth': mb(Math.max(0, heapPeak - heapBefore)),
    });
  };
  for (const size of quick ? [1, 5] : [1, 5, 15]) {
    const file = docx(size * 1024 * 1024);
    run(`Word, ~${size} MB of text`, file.byteLength, () => extractDocxText(file, RAW_IMPORT_CHARS));
  }
  for (const slides of quick ? [50] : [50, 400]) {
    const file = pptx(slides);
    run(`PowerPoint, ${slides} slides`, file.byteLength, () => extractPptxText(file, RAW_IMPORT_CHARS));
  }
  for (const size of quick ? [1] : [1, 10, 25]) {
    const file = strToU8(noteText(size * 1024 * 1024));
    run(`Text, ${size} MB`, file.byteLength, () => decodeTextFile(file, RAW_IMPORT_CHARS));
  }
  table('Import readers (Node; expect roughly 3-10x slower in Hermes on a phone)', rows);

  // The editor recomputes the card preview on every keystroke.
  const preview = [10_000, 50_000, 100_000].map((chars) => {
    const text = noteText(chars);
    const runs = 20;
    const { time } = measure(() => { for (let i = 0; i < runs; i++) generateFlashcards(text); });
    return { 'Note length': `${chars.toLocaleString()} chars`, 'Card preview per keystroke': ms(time / runs) };
  });
  table('Editor card preview cost', preview);
}

// ---------- 2. library growth ----------

type Row = Record<string, string | number | null>;

function loadModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: (name: string) => { if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`); return dependencies[name]; } };
  runInNewContext(output, context);
  return context.exports as T;
}

function adapter(sqlite: DatabaseSync, path: string) {
  const params = (values: unknown[] = []) => values as (string | number | null)[];
  return {
    databasePath: path, options: {},
    execAsync: async (sql: string) => { sqlite.exec(sql); },
    runAsync: async (sql: string, values?: unknown[]) => sqlite.prepare(sql).run(...params(values)),
    getAllAsync: async <T>(sql: string, values?: unknown[]) => sqlite.prepare(sql).all(...params(values)) as T[],
    getFirstAsync: async <T>(sql: string, values?: unknown[]) => (sqlite.prepare(sql).get(...params(values)) ?? null) as T | null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await task(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    closeAsync: async () => sqlite.close(),
  };
}

interface Scale { name: string; subjects: number; notes: number; noteChars: number; cards: number; sessions: number; days: number }

const SCALES: Scale[] = [
  { name: 'New student (1 term)', subjects: 5, notes: 100, noteChars: 2_000, cards: 1_000, sessions: 50, days: 120 },
  { name: 'Active student (2 years)', subjects: 12, notes: 1_000, noteChars: 5_000, cards: 10_000, sessions: 600, days: 730 },
  { name: 'Power user (4 years)', subjects: 30, notes: 4_000, noteChars: 5_000, cards: 40_000, sessions: 2_500, days: 1_460 },
  { name: 'Heavy importer (200 big PDFs)', subjects: 6, notes: 200, noteChars: 100_000, cards: 4_000, sessions: 200, days: 365 },
];

function seedLibrary(sqlite: DatabaseSync, scale: Scale) {
  const now = Date.now();
  sqlite.exec('BEGIN');
  const subject = sqlite.prepare('INSERT INTO subjects (id, name, board, color, icon, created_at) VALUES (?, ?, NULL, ?, ?, ?)');
  const note = sqlite.prepare('INSERT INTO notes (id, subject_id, title, content, tags, linked_note_ids, pinned, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)');
  const card = sqlite.prepare('INSERT INTO flashcards (id, note_id, subject_id, front, back, board, subject, interval, ease_factor, repetitions, next_review, suspended, updated_at, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 2.5, ?, ?, ?, ?, ?)');
  const session = sqlite.prepare('INSERT INTO quiz_sessions (id, board, subject, mode, total, correct, duration_seconds, completed_at) VALUES (?, NULL, ?, ?, 20, ?, ?, ?)');
  const answer = sqlite.prepare('INSERT INTO quiz_answers (id, session_id, flashcard_id, question, user_answer, correct_answer, is_correct, time_taken_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const day = sqlite.prepare('INSERT INTO daily_stats (date, cards_studied, questions_answered, correct_answers, study_time_seconds, xp_earned) VALUES (?, ?, ?, ?, ?, ?)');

  for (let s = 0; s < scale.subjects; s++) subject.run(`s${s}`, `Subject ${s}`, '#2DD4BF', 'library', now - s);
  // Skew notes toward the first subject: one major class usually dominates.
  const subjectOf = (i: number) => `s${i % 3 === 0 ? 0 : i % scale.subjects}`;
  for (let n = 0; n < scale.notes; n++) {
    note.run(`n${n}`, subjectOf(n), `Lecture ${n}`, noteText(scale.noteChars), '[]', '[]', now - n * 60_000, now - n * 60_000);
  }
  for (let c = 0; c < scale.cards; c++) {
    const n = c % scale.notes;
    const due = now + (random() - 0.3) * 30 * 86_400_000;
    card.run(`c${c}`, `n${n}`, subjectOf(n), `${word()} ${word()} ${c}`, sentence(10), `Subject ${n % scale.subjects}`, Math.ceil(random() * 30), Math.floor(random() * 6), Math.round(due), c % 50 === 0 ? 1 : 0, now - c, now - c);
  }
  for (let q = 0; q < scale.sessions; q++) {
    session.run(`q${q}`, 'Subject 0', 'practice', 15, 300, now - q * 3_600_000);
    for (let a = 0; a < 20; a++) answer.run(`q${q}a${a}`, `q${q}`, `c${(q * 20 + a) % scale.cards}`, sentence(6), sentence(8), sentence(8), a % 4 ? 1 : 0, 4_000);
  }
  for (let d = 0; d < scale.days; d++) {
    day.run(localDateKey(new Date(now - d * 86_400_000)), 30, 20, 15, 1_200, 200);
  }
  sqlite.exec('COMMIT');
}

const settings = { studentName: 'Stress', course: 'Load', yearLevel: '1', onboardingComplete: true, dailyGoal: 20, animationPreference: 'off', dialogueLanguage: 'english', themePref: 'dark', lastStudyAt: null };

async function libraryGrowth() {
  const scales = quick ? SCALES.slice(0, 2) : SCALES;
  const queryRows: Record<string, string>[] = [];
  const backupRows: Record<string, string>[] = [];
  const directory = mkdtempSync(join(tmpdir(), 'kwagi-stress-'));
  try {
    for (const scale of scales) {
      const path = join(directory, `${scale.name.replace(/\W+/g, '-')}.db`);
      const sqlite = new DatabaseSync(path);
      sqlite.exec(SCHEMA_SQL);
      const seeded = measure(() => seedLibrary(sqlite, scale));
      sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      const dbBytes = statSync(path).size;
      const db = adapter(sqlite, path);
      const client = { getDb: async () => db, withWriteTransaction: async (_: unknown, task: (tx: unknown) => Promise<void>) => db.withTransactionAsync(() => task(db)) };
      const progress = loadModule<typeof import('../lib/db/progress')>('../lib/db/progress.ts', { './client': client, '@/lib/date': { calculateStreak, localDateKey } });
      const ids = { uid: (prefix = '') => `${prefix}${performance.now()}${random()}` };
      const notes = loadModule<typeof import('../lib/db/notes')>('../lib/db/notes.ts', { './client': client, '@/lib/id': ids });
      const cards = loadModule<typeof import('../lib/db/flashcards')>('../lib/db/flashcards.ts', { './client': client, '@/lib/id': ids, '@/lib/srs': { updateSrs, SWIPE_QUALITY }, './progress': progress });
      const quiz = loadModule<typeof import('../lib/db/quiz')>('../lib/db/quiz.ts', { './client': client, '@/lib/id': ids, './progress': progress });
      let stored = { ...settings };
      const backup = loadModule<typeof import('../lib/backup')>('../lib/backup.ts', {
        '@/lib/db/client': client,
        '@/lib/storage/settings': { loadSettings: async () => stored, saveSettings: async (value: typeof settings) => { stored = value; } },
        './backupValidation': { parseBackup, BACKUP_COLUMNS, BACKUP_TABLES },
      });

      const home = await measureAsync(() => Promise.all([progress.getStreak(), progress.getToday(), progress.getTotals(), cards.countDue(), cards.listFlashcards({ limit: 1, includeSuspended: true }), notes.listSubjects()]));
      const notesList = await measureAsync(() => notes.listNoteSummaries('s0'));
      const notesBytes = notesList.result.reduce((sum, note) => sum + note.preview.length, 0);
      const search = await measureAsync(() => notes.listNoteSummaries('s0', 'derivative 5'));
      const openNote = await measureAsync(() => notes.getNote('n0'));
      const cardLibrary = await measureAsync(() => cards.listFlashcards({ includeSuspended: true }));
      const quizStart = await measureAsync(async () => buildQuiz(await cards.listFlashcards({ subjectId: 's0' }), 20));
      const review = await measureAsync(() => cards.getDueCards(30));
      const progressScreen = await measureAsync(() => Promise.all([progress.getTotals(), progress.getStreak(), quiz.countSessions(), progress.getRecentDays(7)]));
      const save = await measureAsync(() => notes.saveNoteWithCards({ subjectId: 's0', subjectName: 'Subject 0', title: 'New', content: noteText(5_000), cards: generateFlashcards(noteText(5_000)) }));

      queryRows.push({
        Library: scale.name,
        Size: `${scale.notes.toLocaleString()} notes, ${scale.cards.toLocaleString()} cards`,
        'DB file': mb(dbBytes),
        Home: ms(home.time),
        'Open biggest subject': `${ms(notesList.time)} (${notesList.result.length} notes, ${mb(notesBytes)} previews)`,
        'Search subject': ms(search.time),
        'Open note': `${ms(openNote.time)} (${(openNote.result?.content.length ?? 0).toLocaleString()} chars)`,
        'Card library': `${ms(cardLibrary.time)} (${cardLibrary.result.length.toLocaleString()})`,
        'Start quiz': ms(quizStart.time),
        'Start review': ms(review.time),
        Progress: ms(progressScreen.time),
        'Save note + cards': ms(save.time),
      });

      const exported = await measureAsync(async () => JSON.stringify(await backup.createBackup()));
      const rows = (JSON.parse(exported.result) as { data: Record<string, Row[]> }).data;
      const rowCount = Object.values(rows).reduce((sum, list) => sum + list.length, 0);
      let restore = '';
      try {
        const restored = await measureAsync(() => backup.restoreBackup(exported.result));
        restore = `OK in ${ms(restored.time)}`;
      } catch (error) {
        restore = `REJECTED: ${(error as Error).message}`;
      }
      backupRows.push({
        Library: scale.name,
        'Backup size': mb(exported.result.length),
        Records: rowCount.toLocaleString(),
        Export: ms(exported.time),
        'Restore same file': restore,
        Seeding: ms(seeded.time),
      });
      sqlite.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  table('Screen data loads as the library grows (node:sqlite; device SQLite adds per-row bridge cost)', queryRows);
  table('Backup export and restore', backupRows);
}

async function main() {
  console.log(`# Kwagi stress test (${quick ? 'quick' : 'full'}) - Node ${process.version}`);
  importReaders();
  await libraryGrowth();
  console.log(`\nPeak RSS: ${mb(process.memoryUsage().rss)}`);
}

void main();
