import { showAlert } from '@/lib/alert';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { useAppStore } from '@/lib/store';
import { clearAllData } from '@/lib/db/client';
import { useThemeColors } from '@/hooks/useTheme';
import type { AnimationPreference, ThemePref } from '@/lib/storage/settings';

const GOALS = [10, 20, 30, 50];
const THEMES: { value: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny' }, { value: 'dark', label: 'Dark', icon: 'moon' }, { value: 'system', label: 'System', icon: 'phone-portrait' },
];
const ANIMATION_OPTIONS: { value: AnimationPreference; label: string }[] = [
  { value: 'system', label: 'Device' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export default function SettingsScreen() {
  const { settings, updateSettings, setDailyGoal, reset } = useAppStore();
  const c = useThemeColors();
  const [busy, setBusy] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [name, setName] = useState(settings.studentName);
  const [course, setCourse] = useState(settings.course);
  const [year, setYear] = useState(settings.yearLevel);

  const saveProfile = async () => {
    try { await updateSettings({ studentName: name.trim(), course: course.trim(), yearLevel: year.trim() }); showAlert('Profile saved'); }
    catch { showAlert('Could not save profile', 'Your profile could not be stored. Please try again.'); }
  };
  const persistPreference = (patch: Parameters<typeof updateSettings>[0]) => {
    void updateSettings(patch).catch(() => showAlert('Could not save preference', 'The change may not persist after you close Kwagi. Please try again.'));
  };
  const persistGoal = (goal: number) => {
    void setDailyGoal(goal).catch(() => showAlert('Could not save goal', 'The change may not persist after you close Kwagi. Please try again.'));
  };
  const clear = async () => {
    if (busy) return;
    setBusy(true);
    let databaseCleared = false;
    try { await clearAllData(false); databaseCleared = true; await reset(); router.replace('/onboarding'); }
    catch { showAlert(databaseCleared ? 'Preferences could not reset' : 'Could not clear data', databaseCleared ? 'Study data was removed, but preferences may remain. Close and reopen Kwagi, then try Clear all data again.' : 'Kwagi could not remove your data. Please try again.'); }
    finally { setBusy(false); setConfirmingClear(false); }
  };

  return (
    <Screen rail={false}>
      <View className="flex-row items-center border-b border-bordersoft p-4"><Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="h-11 w-11 items-center justify-center"><Ionicons name="chevron-back" size={26} color={c.sub} /></Pressable><Text className="ml-1 text-md font-bold text-ink">Settings</Text></View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"><Container>
        <Section label="STUDENT PROFILE" icon="person">
          <TextInput value={name} onChangeText={setName} accessibilityLabel="Preferred name" placeholder="Preferred name" placeholderTextColor={c.muted} className="mb-2 min-h-11 rounded-card border border-bordersoft bg-card px-3 text-md text-ink" />
          <TextInput value={course} onChangeText={setCourse} accessibilityLabel="Course or program" placeholder="Course or program" placeholderTextColor={c.muted} className="mb-2 min-h-11 rounded-card border border-bordersoft bg-card px-3 text-md text-ink" />
          <TextInput value={year} onChangeText={setYear} accessibilityLabel="Year level" placeholder="Year level (optional)" placeholderTextColor={c.muted} className="min-h-11 rounded-card border border-bordersoft bg-card px-3 text-md text-ink" />
          <PressableScale onPress={() => void saveProfile()} className="mt-3 items-center rounded-card bg-amber py-3" accessibilityRole="button"><Text className="font-bold text-bg">Save profile</Text></PressableScale>
        </Section>
        <Section label="APPEARANCE" icon="color-palette">
          <Text className="mb-3 text-md text-ink">Theme</Text><View className="flex-row gap-2">{THEMES.map((theme) => { const active = settings.themePref === theme.value; return <PressableScale key={theme.value} onPress={() => { void Haptics.selectionAsync(); persistPreference({ themePref: theme.value }); }} haptic={false} accessibilityRole="button" accessibilityState={{ selected: active }} className={`flex-1 items-center rounded-card border py-3 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft'}`}><Ionicons name={theme.icon} size={20} color={active ? c.amber : c.sub} /><Text className={`mt-1 text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>{theme.label}</Text></PressableScale>; })}</View>
          <Text className="mb-2 mt-4 text-md text-ink">Animations</Text>
          <Text className="mb-3 text-xs leading-5 text-muted">Device follows your operating-system Reduce Motion setting.</Text>
          <View className="flex-row gap-2">{ANIMATION_OPTIONS.map((option) => { const active = settings.animationPreference === option.value; return <PressableScale key={option.value} onPress={() => persistPreference({ animationPreference: option.value })} accessibilityRole="button" accessibilityState={{ selected: active }} className={`min-h-11 flex-1 items-center justify-center rounded-card border ${active ? 'border-amber bg-amberdim' : 'border-bordersoft'}`}><Text className={`text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>{option.label}</Text></PressableScale>; })}</View>
        </Section>
        <Section label="STUDY" icon="book"><Text className="text-md text-ink">Daily goal</Text><Text className="mt-1 text-sm text-sub">Card reviews and quiz answers count toward your goal.</Text><View className="mt-3 flex-row flex-wrap gap-2">{GOALS.map((goal) => <PressableScale key={goal} onPress={() => persistGoal(goal)} accessibilityRole="button" accessibilityState={{ selected: settings.dailyGoal === goal }} className={`min-h-11 justify-center rounded-pill border px-4 py-2 ${settings.dailyGoal === goal ? 'border-amber bg-amberdim' : 'border-bordersoft'}`}><Text className={settings.dailyGoal === goal ? 'font-bold text-amber' : 'text-sub'}>{goal}</Text></PressableScale>)}</View></Section>
        <Section label="DATA & SUPPORT" icon="server">
          <SettingLink icon="download-outline" label="Backup and restore" onPress={() => router.push('/backup')} />
          <SettingLink icon="shield-checkmark-outline" label="Privacy and study disclaimer" onPress={() => router.push('/legal')} />
          <SettingLink icon="trash-outline" label={busy ? 'Clearing...' : 'Clear all data'} danger disabled={busy} onPress={() => setConfirmingClear(true)} />
          {confirmingClear && <View className="mt-3 rounded-card border border-coral bg-coral/10 p-3"><Text className="font-bold text-ink">Delete all local data?</Text><Text className="mt-1 text-sm leading-5 text-sub">This removes your notes, cards, quiz history, progress, and preferences. This cannot be undone.</Text><View className="mt-3 flex-row gap-2"><PressableScale onPress={() => void clear()} disabled={busy} accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-card bg-coral"><Text className="font-bold text-bg">{busy ? 'Clearing...' : 'Delete everything'}</Text></PressableScale><PressableScale onPress={() => setConfirmingClear(false)} disabled={busy} accessibilityRole="button" className="min-h-11 flex-1 items-center justify-center rounded-card border border-bordersoft"><Text className="font-bold text-ink">Cancel</Text></PressableScale></View></View>}
        </Section>
        <Section label="ABOUT" icon="information-circle"><Text className="text-md font-bold text-ink">Kwagi, Your Study Buddy</Text><Text className="mt-1 text-xs text-sub">v1.0.0 · For college students in any course</Text><Text className="mt-2 text-xs leading-5 text-muted">Kwagi helps you organize subjects, practice active recall, and review consistently. It does not replace your instructors or official course materials.</Text></Section>
      </Container></ScrollView>
    </Screen>
  );
}

function Section({ label, icon, children }: { label: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) { const c = useThemeColors(); return <View className="mb-5"><View className="mb-2 flex-row items-center"><Ionicons name={icon} size={13} color={c.sub} /><Text className="ml-1.5 text-sm font-bold text-sub">{label}</Text></View><Card>{children}</Card></View>; }
function SettingLink({ icon, label, onPress, danger = false, disabled = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) { const c = useThemeColors(); return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} className="min-h-12 flex-row items-center border-b border-bordersoft py-2" style={{ opacity: disabled ? 0.6 : 1 }}><Ionicons name={icon} size={19} color={danger ? c.coral : c.sub} /><Text className={`ml-2 flex-1 text-md ${danger ? 'text-coral' : 'text-ink'}`}>{label}</Text><Ionicons name="chevron-forward" size={18} color={c.muted} /></Pressable>; }
