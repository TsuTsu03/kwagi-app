import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File as FsFile, Paths } from 'expo-file-system';
import { MAX_BACKUP_CHARS } from './backupValidation';

const BACKUP_DIRECTORY = 'backups';

export function backupFileName(exportedAt: string): string {
  return `kwagi-backup-${exportedAt.slice(0, 10)}.json`;
}

/**
 * Hand the backup to the user as a file. Large libraries produce tens of megabytes, which
 * cannot travel as share-sheet text (Android caps intent extras near 1 MB).
 * Resolves `false` when sharing is unavailable so the caller can offer another route.
 */
export async function saveBackupFile(json: string, exportedAt: string): Promise<boolean> {
  const name = backupFileName(exportedAt);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
  if (!(await Sharing.isAvailableAsync())) return false;
  // Keep only the newest export in the cache; older copies are private data the user already saved.
  const directory = new Directory(Paths.cache, BACKUP_DIRECTORY);
  if (directory.exists) directory.delete();
  directory.create({ intermediates: true });
  const file = new FsFile(directory, name);
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save Kwagi backup' });
  return true;
}

export interface PickedBackup {
  name: string;
  raw: string;
}

/** Let the user choose a saved backup file. Resolves `null` when cancelled. */
export async function pickBackupFile(): Promise<PickedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Android file providers label JSON inconsistently, so accept any file and validate the content.
    type: Platform.OS === 'web' ? ['application/json', '.json'] : '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  try {
    // UTF-8 can use up to 4 bytes per character, so only reject files that cannot fit.
    if (asset.size != null && asset.size > MAX_BACKUP_CHARS * 4) {
      throw new Error(`This file is larger than ${MAX_BACKUP_CHARS / 1_000_000} MB and is not a Kwagi backup Kwagi can restore.`);
    }
    const raw = asset.file ? await asset.file.text() : await new FsFile(asset.uri).text();
    return { name: asset.name, raw };
  } finally {
    if (Platform.OS !== 'web' && asset.uri.startsWith(Paths.cache.uri)) {
      try { new FsFile(asset.uri).delete(); } catch { /* the OS clears its cache eventually */ }
    }
  }
}
