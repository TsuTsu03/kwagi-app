import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../lib/db/schema.ts';
import * as srs from '../lib/srs.ts';
import * as dates from '../lib/date.ts';
import type { Flashcard } from '../lib/db/flashcards';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');

function loadModule<T>(path: string, dependencies: Record<string, unknown>): T {
  const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, require: (name: string) => {
    if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
    return dependencies[name];
  } };
  runInNewContext(output, context);
  return context.exports as T;
}

/** Use actual SQLite and production query/progress code; replace native transport only. */
function library() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA_SQL);
  sqlite.exec("INSERT INTO subjects (id,name,created_at) VALUES ('biology','Biology',1), ('chemistry','Chemistry',1); INSERT INTO notes (id,subject_id,title) VALUES ('note','biology','Cells');");
  const db = {
    runAsync: async (sql: string, values: (string | number | null)[] = []) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql: string, values: (string | number | null)[] = []) => sqlite.prepare(sql).all(...values),
    getFirstAsync: async (sql: string, values: (string | number | null)[] = []) => sqlite.prepare(sql).get(...values),
  };
  const client = {
    getDb: async () => db,
    withWriteTransaction: async (_db: unknown, task: (tx: typeof db) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await task(db); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const progress = loadModule<typeof import('../lib/db/progress')>('../lib/db/progress.ts', {
    './client': client, '@/lib/date': dates,
  });
  let sequence = 0;
  const cards = loadModule<typeof import('../lib/db/flashcards')>('../lib/db/flashcards.ts', {
    './client': client, '@/lib/srs': srs, '@/lib/id': { uid: (prefix: string) => `${prefix}${++sequence}` }, './progress': progress,
  });
  const add = async () => {
    const id = await cards.createFlashcard({ front: 'Cell', back: 'Basic unit', subject_id: 'biology', subject: 'Biology', note_id: 'note' });
    return sqlite.prepare('SELECT * FROM flashcards WHERE id = ?').get(id) as unknown as Flashcard;
  };
  return { sqlite, cards, progress, add };
}

test('stale, deleted, paused, and not-yet-due card reviews cannot add progress or XP', async () => {
  for (const state of ['stale', 'deleted', 'paused', 'future'] as const) {
    const { sqlite, cards, progress, add } = library();
    try {
      const snapshot = await add();
      if (state === 'stale') sqlite.prepare('UPDATE flashcards SET updated_at = updated_at + 1 WHERE id = ?').run(snapshot.id);
      if (state === 'deleted') await cards.deleteFlashcard(snapshot.id);
      if (state === 'paused') await cards.setFlashcardSuspended(snapshot.id, true);
      if (state === 'future') sqlite.prepare('UPDATE flashcards SET next_review = ? WHERE id = ?').run(Date.now() + 86_400_000, snapshot.id);
      const before = sqlite.prepare('SELECT * FROM flashcards WHERE id = ?').get(snapshot.id);
      await assert.rejects(cards.reviewCardAndRecord(snapshot, 'good', 30), /card changed/i, state);
      assert.deepEqual(sqlite.prepare('SELECT * FROM flashcards WHERE id = ?').get(snapshot.id), before, state);
      assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM daily_stats').get()?.count, 0, state);
      const totals = await progress.getTotals();
      assert.equal(totals.totalXp, 0, state);
      assert.equal(totals.totalCardsStudied, 0, state);
    } finally { sqlite.close(); }
  }
});

test('a due review saves its schedule, duration and progress once', async () => {
  const { sqlite, cards, progress, add } = library();
  try {
    const snapshot = await add();
    const started = Date.now();
    await cards.reviewCardAndRecord(snapshot, 'good', 37);
    const saved = sqlite.prepare('SELECT * FROM flashcards WHERE id = ?').get(snapshot.id);
    assert.equal(saved?.repetitions, 1);
    assert.equal(saved?.interval, 1);
    assert.ok(Number(saved?.next_review) >= started + 86_400_000);
    const totals = await progress.getTotals();
    assert.equal(totals.totalCardsStudied, 1);
    assert.equal(totals.totalStudySeconds, 37);
    assert.equal(totals.totalXp, 2);
    assert.equal(totals.totalQuestions, 0);
    await assert.rejects(cards.reviewCardAndRecord(snapshot, 'good', 37), /card changed/i);
    assert.deepEqual(await progress.getTotals(), totals);
  } finally { sqlite.close(); }
});

test('card edits preserve the note link until the card moves to another subject', async () => {
  const { sqlite, cards, add } = library();
  try {
    const snapshot = await add();
    const read = () => sqlite.prepare('SELECT * FROM flashcards WHERE id = ?').get(snapshot.id);
    await cards.updateFlashcard(snapshot.id, { front: 'Edited cell', back: 'Edited answer' });
    assert.equal(read()?.note_id, 'note');
    assert.equal(read()?.front, 'Edited cell');
    await cards.updateFlashcard(snapshot.id, { front: 'Same subject', back: 'Answer', subjectId: 'biology', subjectName: 'Biology' });
    assert.equal(read()?.note_id, 'note');
    await cards.updateFlashcard(snapshot.id, { front: 'Moved card', back: 'Answer', subjectId: 'chemistry', subjectName: 'Chemistry' });
    assert.equal(read()?.note_id, null);
    assert.equal(read()?.subject_id, 'chemistry');
    assert.equal(read()?.subject, 'Chemistry');
    sqlite.prepare('DELETE FROM notes WHERE id = ?').run('note');
    assert.ok(read(), 'Deleting the original note must not delete the reassigned card');
  } finally { sqlite.close(); }
});

test('card listing returns the full library beyond 500 and honors an explicit limit', async () => {
  const { sqlite, cards, add } = library();
  try {
    for (let index = 0; index < 501; index++) await add();
    assert.equal((await cards.listFlashcards()).length, 501);
    assert.equal((await cards.listFlashcards({ subjectId: 'biology' })).length, 501);
    assert.equal((await cards.listFlashcards({ limit: 1 })).length, 1);
    assert.equal((await cards.listFlashcards({ subjectId: 'biology', limit: 1 })).length, 1);
    assert.equal((await cards.listFlashcards({ subjectId: 'chemistry' })).length, 0);
  } finally { sqlite.close(); }
});
