import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_SQL } from '../lib/db/schema.ts';

test('schema enables foreign keys and cascades owned study records', () => {
  assert.match(SCHEMA_SQL, /PRAGMA foreign_keys = ON/i);
  assert.match(SCHEMA_SQL, /subject_id TEXT REFERENCES subjects\(id\) ON DELETE CASCADE/i);
  assert.match(SCHEMA_SQL, /note_id TEXT REFERENCES notes\(id\) ON DELETE CASCADE/i);
  assert.match(SCHEMA_SQL, /session_id TEXT REFERENCES quiz_sessions\(id\) ON DELETE CASCADE/i);
});

test('schema creates indexes for due cards and parent lookups', () => {
  assert.match(SCHEMA_SQL, /idx_flashcards_due/i);
  assert.match(SCHEMA_SQL, /idx_notes_subject/i);
  assert.match(SCHEMA_SQL, /idx_answers_session/i);
});

test('offline v1 schema does not retain the removed chat surface', () => {
  assert.doesNotMatch(SCHEMA_SQL, /chat_messages/i);
});
