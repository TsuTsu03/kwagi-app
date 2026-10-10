import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Directory, File as FsFile, Paths } from 'expo-file-system';
import {
  addAttachments,
  newAttachmentFileName,
  orphanFileNames,
  referencedFileNames,
  type AttachmentKind,
} from '@/lib/db/attachments';

/** Kept originals need a real file system, so they exist only in the Android and iPhone app. */
export const supportsOriginals = Platform.OS !== 'web';

/** Space left free on the phone after keeping files, so the OS and other apps are not starved. */
const FREE_SPACE_RESERVE = 200 * 1024 * 1024;

/** An imported file waiting in the cache until its note is saved or discarded. */
export interface PendingOriginal {
  uri: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string | null;
  size: number;
}

export class StorageFullError extends Error {}

function folder(): Directory {
  // The document folder is permanent app storage; the cache can be purged by the OS.
  const directory = new Directory(Paths.document, 'attachments');
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

export function attachmentUri(fileName: string): string {
  return new FsFile(folder(), fileName).uri;
}

export function fileSize(uri: string): number {
  try { return new FsFile(uri).size ?? 0; } catch { return 0; }
}

export function freeSpace(): number | null {
  if (!supportsOriginals) return null;
  try { return Paths.availableDiskSpace; } catch { return null; }
}

/** Delete pending originals that will not be kept (discarded imports, replaced imports). */
export function discardPending(pending: PendingOriginal[]) {
  for (const file of pending) {
    try { new FsFile(file.uri).delete(); } catch { /* already gone */ }
  }
}

/**
 * Move pending originals into permanent storage and record them on the note.
 * If anything fails, files already moved are removed so storage and records stay in step.
 */
export async function keepOriginals(noteId: string, pending: PendingOriginal[]): Promise<void> {
  if (!supportsOriginals || !pending.length) return;
  const needed = pending.reduce((sum, file) => sum + file.size, 0);
  const free = freeSpace();
  if (free != null && free - needed < FREE_SPACE_RESERVE) {
    discardPending(pending);
    throw new StorageFullError('Your phone is almost out of space, so the original files were not kept. Your note text was saved.');
  }
  const target = folder();
  const moved: { id: string; file: FsFile; original: PendingOriginal }[] = [];
  try {
    for (const original of pending) {
      const { id, fileName } = newAttachmentFileName(original.name);
      const file = new FsFile(target, fileName);
      await new FsFile(original.uri).move(file);
      moved.push({ id, file, original });
    }
    await addAttachments(noteId, moved.map(({ id, file, original }) => ({
      id,
      kind: original.kind,
      name: original.name,
      file_name: file.name,
      mime_type: original.mimeType,
      size: original.size,
    })));
  } catch (error) {
    for (const { file } of moved) { try { file.delete(); } catch { /* swept on next launch */ } }
    discardPending(pending);
    throw error;
  }
}

export function deleteAttachmentFiles(fileNames: string[]) {
  if (!supportsOriginals) return;
  const target = folder();
  for (const name of fileNames) {
    try { new FsFile(target, name).delete(); } catch { /* already gone */ }
  }
}

/** Remove kept files that no note points to any more. Safe to run at any time. */
export async function sweepOrphanFiles(): Promise<number> {
  if (!supportsOriginals) return 0;
  const listed = folder().list().filter((entry): entry is FsFile => entry instanceof FsFile).map((file) => file.name);
  const orphans = orphanFileNames(listed, await referencedFileNames());
  deleteAttachmentFiles(orphans);
  return orphans.length;
}

/** Total bytes in the attachments folder, measured from the files themselves. */
export function attachmentsFolderSize(): number {
  if (!supportsOriginals) return 0;
  return folder().list().reduce((sum, entry) => sum + (entry instanceof FsFile ? entry.size ?? 0 : 0), 0);
}

/** Open a kept file in another app (viewer, Files, Drive) through the system share sheet. */
export async function openAttachment(fileName: string, mimeType: string | null): Promise<boolean> {
  if (!supportsOriginals || !(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(attachmentUri(fileName), mimeType ? { mimeType } : undefined);
  return true;
}
