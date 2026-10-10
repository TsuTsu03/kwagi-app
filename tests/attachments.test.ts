import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../lib/db/schema.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');

// Run the real attachments module over node:sqlite, replacing only the native connection.
function load(sqlite: DatabaseSync) {
  let next = 0;
  const db = {
    runAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).run(...params),
    getAllAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, params: (string | number | null)[] = []) => sqlite.prepare(sql).get(...params) ?? null,
  };
  const client = {
    getDb: async () => db,
    withWriteTransaction: async (_: unknown, task: (tx: typeof db) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await task(db); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const source = readFileSync(new URL('../lib/db/attachments.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const dependencies: Record<string, unknown> = { './client': client, '@/lib/id': { uid: (prefix: string) => `${prefix}${++next}` } };
  const context = { exports: {}, require: (name: string) => dependencies[name] };
  runInNewContext(output, context);
  return context.exports as typeof import('../lib/db/attachments');
}

function library() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA_SQL);
  sqlite.exec(`
    INSERT INTO subjects (id, name, created_at) VALUES ('bio', 'Biology', 1), ('law', 'Law', 2);
    INSERT INTO notes (id, subject_id, title, content) VALUES ('n1', 'bio', 'Cells', ''), ('n2', 'bio', 'DNA', ''), ('n3', 'law', 'Torts', '');
  `);
  return sqlite;
}

const file = (id: string, size: number, kind: 'image' | 'pdf' = 'pdf') => ({ id, kind, name: `${id}.${kind === 'pdf' ? 'pdf' : 'jpg'}`, file_name: `${id}.bin`, mime_type: null, size });

test('kept files are listed per note and totalled per subject', async () => {
  const sqlite = library();
  const attachments = load(sqlite);
  try {
    await attachments.addAttachments('n1', [file('a', 3_000_000), file('b', 1_000, 'image')]);
    await attachments.addAttachments('n3', [file('c', 500)]);
    assert.deepEqual((await attachments.listAttachments('n1')).map((row) => row.id), ['a', 'b']);
    assert.deepEqual(
      (await attachments.storageBySubject()).map((row) => ({ ...row })),
      [{ subject_id: 'bio', name: 'Biology', files: 2, bytes: 3_001_000 }, { subject_id: 'law', name: 'Law', files: 1, bytes: 500 }],
    );
    assert.deepEqual([...await attachments.referencedFileNames()].sort(), ['a.bin', 'b.bin', 'c.bin']);
  } finally { sqlite.close(); }
});

test('a failed insert keeps no partial records', async () => {
  const sqlite = library();
  const attachments = load(sqlite);
  try {
    await attachments.addAttachments('n1', [file('a', 1)]);
    // Duplicate file name violates UNIQUE on the second row.
    await assert.rejects(attachments.addAttachments('n2', [file('x', 1), { ...file('y', 1), file_name: 'a.bin' }]));
    assert.deepEqual(await attachments.listAttachments('n2'), []);
  } finally { sqlite.close(); }
});

test('removing a subject’s files keeps its notes, and deleting a note cascades its records', async () => {
  const sqlite = library();
  sqlite.exec('PRAGMA foreign_keys = ON');
  const attachments = load(sqlite);
  try {
    await attachments.addAttachments('n1', [file('a', 10)]);
    await attachments.addAttachments('n2', [file('b', 20)]);
    await attachments.addAttachments('n3', [file('c', 30)]);
    assert.deepEqual((await attachments.deleteSubjectAttachments('bio')).sort(), ['a.bin', 'b.bin']);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM notes WHERE subject_id = ?').get('bio')?.count, 2);
    sqlite.exec("DELETE FROM notes WHERE id = 'n3'");
    assert.deepEqual([...await attachments.referencedFileNames()], []);
    assert.equal((await attachments.deleteAttachment('missing')), null);
  } finally { sqlite.close(); }
});

test('file names, orphan detection, and sizes', () => {
  const attachments = load(library());
  const named = attachments.newAttachmentFileName('Lecture 3 Slides.PDF');
  assert.match(named.fileName, /^att_\d+\.pdf$/);
  assert.equal(attachments.newAttachmentFileName('no-extension').fileName.includes('.'), false);
  assert.deepEqual(attachments.orphanFileNames(['a.pdf', 'b.jpg', 'c.m4a'], new Set(['b.jpg'])), ['a.pdf', 'c.m4a']);
  assert.equal(attachments.formatBytes(512), '512 B');
  assert.equal(attachments.formatBytes(2048), '2 KB');
  assert.equal(attachments.formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(attachments.formatBytes(3 * 1024 ** 3), '3.00 GB');
});
