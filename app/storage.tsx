import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { showAlert } from '@/lib/alert';
import { attachmentsFolderSize, deleteAttachmentFiles, fileSize, freeSpace, supportsOriginals, sweepOrphanFiles } from '@/lib/attachmentFiles';
import { deleteSubjectAttachments, formatBytes, storageBySubject, type SubjectStorage } from '@/lib/db/attachments';
import { getDb } from '@/lib/db/client';
import { useThemeColors } from '@/hooks/useTheme';

interface Usage {
  files: number;
  database: number;
  free: number | null;
  subjects: SubjectStorage[];
}

async function measureUsage(): Promise<Usage> {
  await sweepOrphanFiles();
  const db = await getDb();
  const databasePath = db.databasePath.startsWith('file://') ? db.databasePath : `file://${db.databasePath}`;
  return {
    files: attachmentsFolderSize(),
    // SQLite keeps recent writes in a -wal file next to the database.
    database: supportsOriginals ? fileSize(databasePath) + fileSize(`${databasePath}-wal`) : 0,
    free: freeSpace(),
    subjects: await storageBySubject(),
  };
}

export default function StorageScreen() {
  const c = useThemeColors();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setUsage(await measureUsage()); setFailed(false); }
    catch { setFailed(true); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const removeFiles = (subject: SubjectStorage) => {
    showAlert('Remove kept files?', `${subject.files} ${subject.files === 1 ? 'file' : 'files'} (${formatBytes(subject.bytes)}) in “${subject.name}” will be deleted from this phone. Notes, cards, and progress stay.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove files', style: 'destructive', onPress: () => void (async () => {
          setBusy(true);
          try { deleteAttachmentFiles(await deleteSubjectAttachments(subject.subject_id)); await load(); }
          catch { showAlert('Could not remove files', 'Nothing was changed. Please try again.'); }
          finally { setBusy(false); }
        })(),
      },
    ]);
  };

  return (
    <Screen rail={false}>
      <View className="flex-row items-center border-b border-bordersoft p-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="h-11 w-11 items-center justify-center"><Ionicons name="chevron-back" size={26} color={c.sub} /></Pressable>
        <Text className="ml-1 text-md font-bold text-ink">Storage</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Container>
          <Card className="mb-4">
            <Text className="text-md font-bold text-ink">Everything stays on this phone</Text>
            <Text className="mt-1 text-sm leading-5 text-sub">Notes, cards, and kept files are stored on this device, not in the cloud. Backups include notes and cards but not kept files.</Text>
            {failed && <Text className="mt-3 text-sm text-coral">Storage use could not be measured. Please try again.</Text>}
            {!supportsOriginals && <Text className="mt-3 text-sm text-sub">Kept files are available in the Android and iPhone app.</Text>}
            {usage && supportsOriginals && (
              <View className="mt-4 gap-2">
                <Row label="Kept photos and files" value={formatBytes(usage.files)} />
                <Row label="Notes, cards, and progress" value={formatBytes(usage.database)} />
                {usage.free != null && <Row label="Free space on this phone" value={formatBytes(usage.free)} />}
              </View>
            )}
          </Card>
          {usage && supportsOriginals && (
            <Card>
              <Text className="text-md font-bold text-ink">Kept files by subject</Text>
              {!usage.subjects.length && <Text className="mt-2 text-sm text-sub">No kept files yet. Turn on “Keep original photos and files” when importing notes.</Text>}
              {usage.subjects.map((subject) => (
                <View key={subject.subject_id} className="mt-3 flex-row items-center border-t border-bordersoft pt-3">
                  <View className="flex-1">
                    <Text className="text-md font-semibold text-ink">{subject.name}</Text>
                    <Text className="text-sm text-sub">{subject.files} {subject.files === 1 ? 'file' : 'files'} · {formatBytes(subject.bytes)}</Text>
                  </View>
                  <Button label="Remove files" variant="ghost" disabled={busy} onPress={() => removeFiles(subject)} />
                </View>
              ))}
            </Card>
          )}
        </Container>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-sub">{label}</Text>
      <Text className="text-sm font-bold text-ink">{value}</Text>
    </View>
  );
}
