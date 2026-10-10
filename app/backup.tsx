import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createBackup, restoreBackup } from '@/lib/backup';
import { MAX_BACKUP_CHARS, parseBackup } from '@/lib/backupValidation';
import { pickBackupFile, saveBackupFile } from '@/lib/backupFile';
import { sweepOrphanFiles } from '@/lib/attachmentFiles';
import { useAppStore } from '@/lib/store';
import { useThemeColors } from '@/hooks/useTheme';

/** Larger text freezes a TextInput, so only small backups get the copyable text fallback. */
const TEXT_FALLBACK_CHARS = 500_000;
const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

export default function BackupScreen() {
  const c = useThemeColors();
  const hydrate = useAppStore((state) => state.hydrate);
  const [raw, setRaw] = useState('');
  const [exported, setExported] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);
  // A picked file can be tens of megabytes; keep it out of rendered state.
  const pickedRaw = useRef<string | null>(null);
  const [pickedName, setPickedName] = useState('');

  const report = (text: string, error = false) => { setMessage(text); setFailed(error); };
  const exportData = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    report('');
    try {
      const backup = await createBackup();
      const json = JSON.stringify(backup);
      if (json.length > MAX_BACKUP_CHARS) {
        report('Your library is too large for one backup file. Delete old quiz history or unused subjects, then try again.', true);
        return;
      }
      const small = json.length <= TEXT_FALLBACK_CHARS;
      if (small) setExported(json);
      const saved = await saveBackupFile(json, backup.exportedAt);
      const size = `${(json.length / 1_000_000).toFixed(1)} MB`;
      if (!saved) report(small ? 'Sharing is unavailable on this device. Copy the backup text below and save it yourself.' : 'Sharing is unavailable on this device, so the backup could not be saved.', true);
      else if (Platform.OS === 'web') report(`Backup download started (${size}).${small ? ' You can also copy the text below.' : ''}`);
      else report(`Backup file ready (${size}). Save it to Files, Drive, or another place you trust.`);
    } catch {
      report('The backup could not be exported. Please try again.', true);
    } finally { lock.current = false; setBusy(false); }
  };

  const prepareRestore = () => {
    pickedRaw.current = null;
    setPickedName('');
    try { parseBackup(raw); report(''); setConfirming(true); }
    catch (error) { report(error instanceof Error ? error.message : 'This backup is invalid.', true); }
  };
  const chooseFile = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    report('');
    try {
      const picked = await pickBackupFile();
      if (!picked) return;
      await yieldToUi();
      parseBackup(picked.raw);
      pickedRaw.current = picked.raw;
      setPickedName(picked.name);
      setConfirming(true);
    } catch (error) {
      pickedRaw.current = null;
      report(error instanceof Error ? error.message : 'This backup file could not be read.', true);
    } finally { lock.current = false; setBusy(false); }
  };
  const importData = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    report('');
    try {
      await yieldToUi();
      await restoreBackup(pickedRaw.current ?? raw);
      await sweepOrphanFiles().catch(() => undefined);
      await hydrate();
      pickedRaw.current = null;
      setPickedName('');
      setRaw('');
      setExported('');
      report('Backup restored. Your library and preferences have been replaced.');
    } catch (error) {
      report(error instanceof Error ? error.message : 'The backup could not be restored. Please try again.', true);
    } finally { lock.current = false; setBusy(false); setConfirming(false); }
  };
  const cancelRestore = () => { pickedRaw.current = null; setPickedName(''); setConfirming(false); };

  return (
    <Screen rail={false}>
      <View className="flex-row items-center border-b border-bordersoft p-4">
        <Pressable onPress={() => router.back()} disabled={busy} accessibilityRole="button" accessibilityLabel="Back" className="h-11 w-11 items-center justify-center"><Ionicons name="chevron-back" size={26} color={c.sub} /></Pressable>
        <Text className="ml-1 text-md font-bold text-ink">Backup and restore</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Container>
          {!!message && <View accessibilityLiveRegion="polite" className={`mb-4 rounded-card border p-3 ${failed ? 'border-coral' : 'border-teal'}`}><Text className={failed ? 'text-coral' : 'text-ink'}>{message}</Text></View>}
          <Card className="mb-4">
            <Text className="text-md font-bold text-ink">Keep a copy of your library</Text>
            <Text className="mb-4 mt-1 text-sm leading-5 text-sub">Save your subjects, notes, cards, quiz history, and preferences. Kept photos and files are not included. Backups contain private study content. Store them somewhere you trust.</Text>
            <Button label={busy ? 'Working...' : Platform.OS === 'web' ? 'Download backup' : 'Share backup'} disabled={busy || confirming} onPress={() => void exportData()} />
            {!!exported && <View className="mt-4"><Text className="mb-2 text-sm text-sub">Backup text (select all and copy)</Text><TextInput value={exported} editable={false} selectTextOnFocus accessibilityLabel="Exported backup JSON" multiline textAlignVertical="top" className="max-h-[200px] min-h-[120px] rounded-card border border-bordersoft bg-card p-3 text-xs text-ink" /></View>}
          </Card>
          <Card>
            <Text className="text-md font-bold text-ink">Restore a saved backup</Text>
            <Text className="mt-1 text-sm leading-5 text-sub">Choose your saved backup file. Kwagi checks it before asking you to replace your current library.</Text>
            <Button label={busy && !confirming ? 'Checking...' : 'Choose backup file'} disabled={busy || confirming} onPress={() => void chooseFile()} className="mt-4" />
            <Text className="mt-4 text-sm text-sub">Or paste the text of a small backup:</Text>
            <TextInput value={raw} onChangeText={(text) => { setRaw(text); setConfirming(false); }} editable={!busy && !confirming} accessibilityLabel="Backup JSON to restore" placeholder="Paste backup JSON" placeholderTextColor={c.muted} multiline textAlignVertical="top" className="my-4 max-h-[320px] min-h-[180px] rounded-card border border-bordersoft bg-card p-3 text-xs text-ink" />
            {confirming ? <View className="rounded-card border border-coral p-3">
              <Text className="font-bold text-ink">Replace all current data?</Text>
              {!!pickedName && <Text className="mt-1 text-sm text-sub">From {pickedName}</Text>}
              <Text className="mb-3 mt-1 text-sm leading-5 text-sub">Your current notes, cards, kept files, progress, and preferences will be replaced. Export a backup first if you want to keep them.</Text>
              <View className="gap-2"><Button label={busy ? 'Restoring...' : 'Replace with backup'} disabled={busy} onPress={() => void importData()} /><Button label="Cancel" variant="secondary" disabled={busy} onPress={cancelRestore} /></View>
            </View> : <Button label="Check backup" variant="secondary" disabled={busy || !raw.trim()} onPress={prepareRestore} />}
          </Card>
        </Container>
      </ScrollView>
    </Screen>
  );
}
