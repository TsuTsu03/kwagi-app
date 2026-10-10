import { getDb, withWriteTransaction } from './client';
import { uid } from '@/lib/id';

export type AttachmentKind = 'image' | 'pdf' | 'document' | 'audio';

export interface Attachment {
  id: string;
  note_id: string;
  kind: AttachmentKind;
  name: string;
  /** File name inside the app's attachments folder. */
  file_name: string;
  mime_type: string | null;
  size: number;
  created_at: number;
}

export interface NewAttachment {
  kind: AttachmentKind;
  name: string;
  file_name: string;
  mime_type: string | null;
  size: number;
}

export interface SubjectStorage {
  subject_id: string;
  name: string;
  files: number;
  bytes: number;
}

/** A new attachment id plus a matching unique file name with the original extension. */
export function newAttachmentFileName(originalName: string): { id: string; fileName: string } {
  const id = uid('att_');
  const extension = originalName.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1];
  return { id, fileName: extension ? `${id}.${extension}` : id };
}

export async function listAttachments(noteId: string): Promise<Attachment[]> {
  const db = await getDb();
  return db.getAllAsync<Attachment>('SELECT * FROM attachments WHERE note_id = ? ORDER BY created_at ASC, name ASC', [noteId]);
}

/** Record files already moved into the attachments folder. All rows are added or none are. */
export async function addAttachments(noteId: string, files: (NewAttachment & { id: string })[]): Promise<void> {
  if (!files.length) return;
  const db = await getDb();
  const now = Date.now();
  await withWriteTransaction(db, async (tx) => {
    for (const [index, file] of files.entries()) {
      await tx.runAsync(
        'INSERT INTO attachments (id, note_id, kind, name, file_name, mime_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [file.id, noteId, file.kind, file.name, file.file_name, file.mime_type, file.size, now + index],
      );
    }
  });
}

/** Remove an attachment record; the caller deletes the file it returns. */
export async function deleteAttachment(id: string): Promise<Attachment | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Attachment>('SELECT * FROM attachments WHERE id = ?', [id]);
  if (row) await db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
  return row;
}

/** Remove every attachment record in a subject, keeping the notes' text. */
export async function deleteSubjectAttachments(subjectId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ file_name: string }>(
    'SELECT a.file_name FROM attachments a JOIN notes n ON n.id = a.note_id WHERE n.subject_id = ?',
    [subjectId],
  );
  await db.runAsync('DELETE FROM attachments WHERE note_id IN (SELECT id FROM notes WHERE subject_id = ?)', [subjectId]);
  return rows.map((row) => row.file_name);
}

/** Space used by kept files in each subject, largest first. */
export async function storageBySubject(): Promise<SubjectStorage[]> {
  const db = await getDb();
  return db.getAllAsync<SubjectStorage>(`
    SELECT s.id AS subject_id, s.name, COUNT(a.id) AS files, COALESCE(SUM(a.size), 0) AS bytes
    FROM subjects s
    JOIN notes n ON n.subject_id = s.id
    JOIN attachments a ON a.note_id = n.id
    GROUP BY s.id
    ORDER BY bytes DESC
  `);
}

export async function referencedFileNames(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ file_name: string }>('SELECT file_name FROM attachments');
  return new Set(rows.map((row) => row.file_name));
}

/** Files in the folder that no record points to (deleted notes, restores, interrupted saves). */
export function orphanFileNames(listed: string[], referenced: Set<string>): string[] {
  return listed.filter((name) => !referenced.has(name));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
