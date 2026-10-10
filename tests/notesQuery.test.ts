import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from '../lib/db/schema.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript') as typeof import('typescript');

// Run the real notes module over node:sqlite, replacing only the native connection.
function loadNotes(sqlite: DatabaseSync) {
  const db = {
    getAllAsync: async (sql: string, params: (string | number)[] = []) => sqlite.prepare(sql).all(...params),
    getFirstAsync: async (sql: string, params: (string | number)[] = []) => sqlite.prepare(sql).get(...params) ?? null,
  };
  const source = readFileSync(new URL('../lib/db/notes.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const dependencies: Record<string, unknown> = { './client': { getDb: async () => db }, '@/lib/id': { uid: (prefix: string) => `${prefix}1` } };
  const context = { exports: {}, require: (name: string) => dependencies[name] };
  runInNewContext(output, context);
  return context.exports as typeof import('../lib/db/notes');
}

test('note lists carry short previews and search full content in SQLite', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(SCHEMA_SQL);
  sqlite.prepare('INSERT INTO subjects (id, name, created_at) VALUES (?, ?, ?)').run('s1', 'Bio', 1);
  const insert = sqlite.prepare('INSERT INTO notes (id, subject_id, title, content, tags, linked_note_ids, pinned, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insert.run('long', 's1', 'Imported PDF', `${'filler '.repeat(20_000)}Krebs Cycle appears near the end`, '[]', '[]', 0, 2, 2);
  insert.run('pinned', 's1', 'Pinned', 'Short', '["exam"]', '[]', 1, 1, 1);
  const notes = loadNotes(sqlite);
  try {
    const all = await notes.listNoteSummaries('s1');
    assert.deepEqual(all.map((note) => note.id), ['pinned', 'long']);
    assert.ok(all[1].preview.length <= 240);
    assert.equal('content' in all[1], false);
    assert.deepEqual((await notes.listNoteSummaries('s1', '  krebs CYCLE ')).map((note) => note.id), ['long']);
    assert.deepEqual((await notes.listNoteSummaries('s1', 'EXAM')).map((note) => note.id), ['pinned']);
    assert.deepEqual(await notes.listNoteSummaries('s1', 'missing'), []);
    assert.equal((await notes.getNote('long'))?.content.endsWith('near the end'), true);
  } finally {
    sqlite.close();
  }
});
