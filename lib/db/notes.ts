import { getDb } from './client';
import { uid } from '@/lib/id';

export interface Subject {
  id: string;
  name: string;
  board: string | null;
  color: string | null;
  icon: string | null;
  created_at: number;
}

export interface SubjectWithCount extends Subject {
  note_count: number;
  last_updated: number | null;
}

export interface Note {
  id: string;
  subject_id: string | null;
  title: string;
  content: string;
  tags: string[];
  linked_note_ids: string[];
  pinned: number;
  updated_at: number;
  created_at: number;
}

interface NoteRow {
  id: string;
  subject_id: string | null;
  title: string;
  content: string | null;
  tags: string | null;
  linked_note_ids: string | null;
  pinned: number;
  updated_at: number;
  created_at: number;
}

function parseNote(row: NoteRow): Note {
  return {
    id: row.id,
    subject_id: row.subject_id,
    title: row.title,
    content: row.content ?? '',
    tags: safeParse(row.tags, []),
    linked_note_ids: safeParse(row.linked_note_ids, []),
    pinned: row.pinned,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ---------------- Subjects ----------------

export async function listSubjects(): Promise<SubjectWithCount[]> {
  const db = await getDb();
  return db.getAllAsync<SubjectWithCount>(`
    SELECT s.*,
      (SELECT COUNT(*) FROM notes n WHERE n.subject_id = s.id) AS note_count,
      (SELECT MAX(n.updated_at) FROM notes n WHERE n.subject_id = s.id) AS last_updated
    FROM subjects s
    ORDER BY s.created_at ASC
  `);
}

export async function createSubject(input: {
  name: string;
  board?: string | null;
  color?: string | null;
  icon?: string | null;
}): Promise<string> {
  const db = await getDb();
  const id = uid('subj_');
  await db.runAsync(
    'INSERT INTO subjects (id, name, board, color, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.name, input.board ?? null, input.color ?? null, input.icon ?? null, Date.now()],
  );
  return id;
}

export async function deleteSubject(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE subject_id = ?', [id]);
  await db.runAsync('DELETE FROM subjects WHERE id = ?', [id]);
}

// ---------------- Notes ----------------

export async function listNotes(subjectId: string): Promise<Note[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    'SELECT * FROM notes WHERE subject_id = ? ORDER BY pinned DESC, updated_at DESC',
    [subjectId],
  );
  return rows.map(parseNote);
}

export async function getNote(id: string): Promise<Note | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
  return row ? parseNote(row) : null;
}

export async function createNote(input: {
  subject_id: string | null;
  title: string;
  content?: string;
  tags?: string[];
}): Promise<string> {
  const db = await getDb();
  const id = uid('note_');
  const now = Date.now();
  await db.runAsync(
    'INSERT INTO notes (id, subject_id, title, content, tags, linked_note_ids, pinned, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
    [
      id,
      input.subject_id,
      input.title,
      input.content ?? '',
      JSON.stringify(input.tags ?? []),
      JSON.stringify([]),
      now,
      now,
    ],
  );
  return id;
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string; tags?: string[] },
): Promise<void> {
  const db = await getDb();
  const existing = await getNote(id);
  if (!existing) return;
  await db.runAsync(
    'UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = ? WHERE id = ?',
    [
      patch.title ?? existing.title,
      patch.content ?? existing.content,
      JSON.stringify(patch.tags ?? existing.tags),
      Date.now(),
      id,
    ],
  );
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

export async function togglePin(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notes SET pinned = CASE pinned WHEN 1 THEN 0 ELSE 1 END WHERE id = ?', [
    id,
  ]);
}
