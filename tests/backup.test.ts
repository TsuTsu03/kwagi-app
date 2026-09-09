import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { parseBackup, type KwagiBackup } from '../lib/backupValidation.ts';
import { SCHEMA_SQL } from '../lib/db/schema.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');
const settings = { studentName: 'Student', course: 'Biology', yearLevel: '1', onboardingComplete: true, dailyGoal: 20, animationPreference: 'off', dialogueLanguage: 'english', themePref: 'dark', lastStudyAt: null } as const;
const subject = { id: 's1', name: 'Biology', board: null, color: null, icon: null, created_at: 1 };
function fixture(): KwagiBackup {
  return {
    format: 'kwagi-backup', version: 1, exportedAt: '2026-09-09T00:00:00.000Z', settings: { ...settings },
    data: {
      subjects: [{ ...subject }],
      notes: [{ id: 'n1', subject_id: 's1', title: 'Cells', content: 'Cell :: Basic unit', tags: '[]', linked_note_ids: '[]', pinned: 0, created_at: 1, updated_at: 1 }],
      flashcards: [{ id: 'c1', subject_id: 's1', note_id: 'n1', front: 'Cell', back: 'Basic unit', board: null, subject: 'Biology', interval: 1, ease_factor: 2.5, repetitions: 0, next_review: 1, suspended: 0, updated_at: 1, created_at: 1 }],
      quiz_sessions: [], quiz_answers: [], daily_stats: [],
    },
  };
}

test('backup validation accepts a complete library and an intentionally empty library', () => {
  const backup = fixture();
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  Object.values(backup.data).forEach((rows) => rows.splice(0));
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
});

test('backup validation rejects incomplete tables, duplicate IDs and broken relationships', () => {
  for (const modify of [
    (b: KwagiBackup) => { Reflect.deleteProperty(b.data, 'notes'); },
    (b: KwagiBackup) => { b.data.subjects.push({ ...subject }); },
    (b: KwagiBackup) => { b.data.flashcards[0].note_id = 'missing'; },
    (b: KwagiBackup) => { b.data.notes[0].subject_id = 'missing'; },
    (b: KwagiBackup) => { Reflect.deleteProperty(b.data.notes[0], 'tags'); },
  ]) {
    const backup = fixture(); modify(backup);
    assert.throws(() => parseBackup(JSON.stringify(backup)));
  }
});

test('backup validation rejects unsafe preferences, malformed arrays and impossible statistics', () => {
  for (const [key, value] of [['studentName', 1], ['dailyGoal', -1], ['themePref', ['dark']], ['onboardingComplete', 'false'], ['lastStudyAt', -1]]) {
    const backup = fixture(); Object.assign(backup.settings, { [key as string]: value });
    assert.throws(() => parseBackup(JSON.stringify(backup)), /preferences/);
  }
  const backup = fixture(); backup.data.notes[0].tags = '{"not":"an array"}';
  assert.throws(() => parseBackup(JSON.stringify(backup)), /tags/);
  backup.data.notes[0].tags = '[]';
  backup.data.daily_stats.push({ date: '2026-02-30', cards_studied: 0, questions_answered: 1, correct_answers: 0, study_time_seconds: 1, xp_earned: 0 });
  assert.throws(() => parseBackup(JSON.stringify(backup)), /progress/);
  backup.data.daily_stats[0].date = '2026-02-28'; backup.data.daily_stats[0].correct_answers = 2;
  assert.throws(() => parseBackup(JSON.stringify(backup)), /progress/);
});

// Run the actual persistence module over SQLite, replacing only native transport.
function loadModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: (name: string) => { if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`); return dependencies[name]; } };
  runInNewContext(output, context);
  return context.exports as T;
}
function adapter(sqlite: DatabaseSync, path = ':memory:') {
  return {
    databasePath: path, options: {},
    execAsync: async (sql: string) => { sqlite.exec(sql); },
    runAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).run(...params),
    getAllAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).get(...params),
    withTransactionAsync: async (task: () => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await task(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    closeAsync: async () => sqlite.close(),
  };
}

test('restore rejects a partial backup without opening storage; successful restore round-trips SQL content', async () => {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec(SCHEMA_SQL);
  const db = adapter(sqlite);
  let opened = 0;
  let stored = { ...settings };
  const module = loadModule<typeof import('../lib/backup')>('../lib/backup.ts', {
    '@/lib/db/client': { getDb: async () => { opened++; return db; }, withWriteTransaction: async (_: unknown, task: (db: unknown) => Promise<void>) => db.withTransactionAsync(() => task(db)) },
    '@/lib/storage/settings': { loadSettings: async () => stored, saveSettings: async (value: typeof settings) => { stored = value; } },
    './backupValidation': { parseBackup, BACKUP_COLUMNS: requireValidation().BACKUP_COLUMNS, BACKUP_TABLES: requireValidation().BACKUP_TABLES },
  });
  try {
    await assert.rejects(module.restoreBackup(JSON.stringify({ format: 'kwagi-backup', version: 1, data: {}, settings: {} })));
    assert.equal(opened, 0);
    await module.restoreBackup(JSON.stringify(fixture()));
    const exported = await module.createBackup();
    assert.equal(exported.data.notes[0].title, 'Cells');
    assert.equal(exported.data.flashcards[0].note_id, 'n1');
    assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { sqlite.close(); }
});

function requireValidation() {
  return loadModule<typeof import('../lib/backupValidation')>('../lib/backupValidation.ts', {});
}

test('a failed preference save rolls back all restored SQL rows', async () => {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec(SCHEMA_SQL);
  sqlite.prepare('INSERT INTO subjects (id,name,created_at) VALUES (?,?,?)').run('original', 'Keep me', 1);
  const db = adapter(sqlite);
  const module = loadModule<typeof import('../lib/backup')>('../lib/backup.ts', {
    '@/lib/db/client': { getDb: async () => db, withWriteTransaction: async (_: unknown, task: (db: unknown) => Promise<void>) => db.withTransactionAsync(() => task(db)) },
    '@/lib/storage/settings': { loadSettings: async () => settings, saveSettings: async () => { throw new Error('Storage full'); } },
    './backupValidation': requireValidation(),
  });
  try {
    await assert.rejects(module.restoreBackup(JSON.stringify(fixture())), /Storage full/);
    assert.equal(sqlite.prepare('SELECT name FROM subjects').get()?.name, 'Keep me');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM notes').get()?.count, 0);
  } finally { sqlite.close(); }
});

test('a failed database commit restores the previous preferences and SQL library', async () => {
  const sqlite = new DatabaseSync(':memory:'); sqlite.exec(SCHEMA_SQL);
  sqlite.prepare('INSERT INTO subjects (id,name,created_at) VALUES (?,?,?)').run('original', 'Keep me', 1);
  const db = adapter(sqlite);
  let stored = { ...settings };
  const module = loadModule<typeof import('../lib/backup')>('../lib/backup.ts', {
    '@/lib/db/client': { getDb: async () => db, withWriteTransaction: async (_: unknown, task: (db: unknown) => Promise<void>) => db.withTransactionAsync(async () => { await task(db); throw new Error('Commit failed'); }) },
    '@/lib/storage/settings': { loadSettings: async () => stored, saveSettings: async (value: typeof settings) => { stored = value; } },
    './backupValidation': requireValidation(),
  });
  try {
    const incoming = fixture(); incoming.settings.studentName = 'Imported';
    await assert.rejects(module.restoreBackup(JSON.stringify(incoming)), /Commit failed/);
    assert.equal(stored.studentName, 'Student');
    assert.equal(sqlite.prepare('SELECT name FROM subjects').get()?.name, 'Keep me');
  } finally { sqlite.close(); }
});

test('native write connections enforce real foreign keys and preserve an empty library across cold starts', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'kwagi-sqlite-test-')).replaceAll('\\', '/');
  const connections: ReturnType<typeof adapter>[] = [];
  const open = async (name: string, _options?: unknown, selectedDirectory = directory) => {
    const path = `${selectedDirectory}/${name}`;
    const sqlite = new DatabaseSync(path); sqlite.exec('PRAGMA foreign_keys = OFF');
    const db = adapter(sqlite, path); connections.push(db); return db;
  };
  const dependencies = { 'expo-sqlite': { openDatabaseAsync: open }, 'react-native': { Platform: { OS: 'ios' } }, './schema': { SCHEMA_SQL }, '@/lib/id': { uid: (prefix: string) => `${prefix}${Math.random()}` } };
  try {
    const first = loadModule<typeof import('../lib/db/client')>('../lib/db/client.ts', dependencies);
    const db = await first.getDb();
    assert.equal((await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM subjects'))?.count, 1);
    await assert.rejects(first.withWriteTransaction(db, (tx) => tx.runAsync('INSERT INTO notes (id,subject_id,title) VALUES (?,?,?)', ['bad', 'missing', 'Orphan']).then(() => undefined)), /FOREIGN KEY/);
    await first.clearAllData(false);
    const second = loadModule<typeof import('../lib/db/client')>('../lib/db/client.ts', dependencies);
    const reopened = await second.getDb();
    assert.equal((await reopened.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM subjects'))?.count, 0);
    assert.equal((await reopened.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM flashcards'))?.count, 0);
  } finally {
    for (const db of connections) { try { await db.closeAsync(); } catch { /* Already closed transaction connection. */ } }
    const expectedPrefix = join(tmpdir(), 'kwagi-sqlite-test-').replaceAll('\\', '/');
    assert.ok(directory.startsWith(expectedPrefix), 'Only remove this test temporary directory');
    rmSync(directory, { recursive: true, force: true });
  }
});
