import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createBackup, restoreBackup } from '@/lib/backup';
import { parseBackup } from '@/lib/backupValidation';
import { useAppStore } from '@/lib/store';
import { useThemeColors } from '@/hooks/useTheme';

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

  const report = (text: string, error = false) => { setMessage(text); setFailed(error); };
  const exportData = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    report('');
    try {
      const backup = await createBackup();
      const json = JSON.stringify(backup);
      setExported(json);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `kwagi-backup-${backup.exportedAt.slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        report('Backup download started. You can also copy the text below.');
      } else {
        const result = await Share.share({ title: 'Kwagi backup', message: json });
        report(result.action === Share.dismissedAction ? 'Sharing cancelled. Your backup text is available below.' : 'Backup prepared. Keep your copy in a safe place.');
      }
    } catch {
      report('The backup could not be exported. If backup text appears below, you can copy it and save it yourself.', true);
    } finally { lock.current = false; setBusy(false); }
  };

  const prepareRestore = () => {
    try { parseBackup(raw); report(''); setConfirming(true); }
    catch (error) { report(error instanceof Error ? error.message : 'This backup is invalid.', true); }
  };
  const importData = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    report('');
    try {
      await restoreBackup(raw);
      await hydrate();
      setRaw('');
      setExported('');
      report('Backup restored. Your library and preferences have been replaced.');
    } catch (error) {
      report(error instanceof Error ? error.message : 'The backup could not be restored. Please try again.', true);
    } finally { lock.current = false; setBusy(false); setConfirming(false); }
  };

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
            <Text className="mb-4 mt-1 text-sm leading-5 text-sub">Save your subjects, notes, cards, quiz history, and preferences. Backups contain private study content. Store them somewhere you trust.</Text>
            <Button label={busy ? 'Working...' : Platform.OS === 'web' ? 'Download backup' : 'Share backup'} disabled={busy || confirming} onPress={() => void exportData()} />
            {!!exported && <View className="mt-4"><Text className="mb-2 text-sm text-sub">Backup text (select all and copy)</Text><TextInput value={exported} editable={false} selectTextOnFocus accessibilityLabel="Exported backup JSON" multiline textAlignVertical="top" className="max-h-[200px] min-h-[120px] rounded-card border border-bordersoft bg-card p-3 text-xs text-ink" /></View>}
          </Card>
          <Card>
            <Text className="text-md font-bold text-ink">Restore a saved backup</Text>
            <Text className="mt-1 text-sm leading-5 text-sub">Open your saved JSON file and paste its full text below. Kwagi checks it before asking you to replace your current library.</Text>
            <TextInput value={raw} onChangeText={(text) => { setRaw(text); setConfirming(false); }} editable={!busy && !confirming} accessibilityLabel="Backup JSON to restore" placeholder="Paste backup JSON" placeholderTextColor={c.muted} multiline textAlignVertical="top" className="my-4 max-h-[320px] min-h-[180px] rounded-card border border-bordersoft bg-card p-3 text-xs text-ink" />
            {confirming ? <View className="rounded-card border border-coral p-3">
              <Text className="font-bold text-ink">Replace all current data?</Text>
              <Text className="mb-3 mt-1 text-sm leading-5 text-sub">Your current notes, cards, progress, and preferences will be replaced. Export a backup first if you want to keep them.</Text>
              <View className="gap-2"><Button label={busy ? 'Restoring...' : 'Replace with backup'} disabled={busy} onPress={() => void importData()} /><Button label="Cancel" variant="secondary" disabled={busy} onPress={() => setConfirming(false)} /></View>
            </View> : <Button label="Check backup" variant="secondary" disabled={busy || !raw.trim()} onPress={prepareRestore} />}
          </Card>
        </Container>
      </ScrollView>
    </Screen>
  );
}
