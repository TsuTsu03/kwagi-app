import { getDb, withWriteTransaction } from '@/lib/db/client';
import { loadSettings, saveSettings } from '@/lib/storage/settings';
import { BACKUP_COLUMNS, BACKUP_TABLES, parseBackup, type KwagiBackup } from './backupValidation';

export type { KwagiBackup } from './backupValidation';

export async function createBackup(): Promise<KwagiBackup> {
  const db = await getDb();
  const data = {} as KwagiBackup['data'];
  await withWriteTransaction(db, async (tx) => {
    for (const table of BACKUP_TABLES) data[table] = await tx.getAllAsync(`SELECT * FROM ${table}`);
  });
  return { format: 'kwagi-backup', version: 1, exportedAt: new Date().toISOString(), settings: await loadSettings(), data };
}

export async function restoreBackup(raw: string): Promise<void> {
  const backup = parseBackup(raw);
  const previousSettings = await loadSettings();
  const db = await getDb();
  let settingsSaved = false;
  try {
    await withWriteTransaction(db, async (tx) => {
      await tx.execAsync(`
        DELETE FROM quiz_answers;
        DELETE FROM quiz_sessions;
        DELETE FROM flashcards;
        DELETE FROM notes;
        DELETE FROM subjects;
        DELETE FROM daily_stats;
      `);
      for (const table of BACKUP_TABLES) {
        const columns = BACKUP_COLUMNS[table];
        for (const row of backup.data[table]) {
          await tx.runAsync(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
            columns.map((column) => row[column]),
          );
        }
      }
      // A failed preference write aborts the database replacement too.
      await saveSettings(backup.settings);
      settingsSaved = true;
    });
  } catch (error) {
    // SQLite and AsyncStorage cannot share a transaction. Compensate if COMMIT fails.
    if (settingsSaved) {
      try { await saveSettings(previousSettings); }
      catch { throw new Error('Study data was not restored, and preferences could not be recovered. Restart Kwagi and check Settings.'); }
    }
    throw error;
  }
}
