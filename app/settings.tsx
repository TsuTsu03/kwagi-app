import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { FadeIn } from '@/components/ui/FadeIn';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { useAppStore } from '@/lib/store';
import { BOARD_LIST, type BoardId } from '@/constants/boards';
import { clearAllData } from '@/lib/db/client';
import { useThemeColors } from '@/hooks/useTheme';
import type { ThemePref } from '@/lib/storage/settings';

const GOALS = [10, 20, 30, 50, 100];

const THEMES: { value: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'phone-portrait' },
];

function SectionLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const c = useThemeColors();
  return (
    <View className="mb-2 flex-row items-center">
      <Ionicons name={icon} size={13} color={c.sub} />
      <Text className="ml-1.5 text-sm font-bold tracking-tight text-sub">{label}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings, setActiveBoard, setDailyGoal } = useAppStore();
  const c = useThemeColors();
  const [busy, setBusy] = useState(false);

  const confirmClear = () => {
    Alert.alert(
      'Clear all data?',
      'This permanently deletes all your notes, cards, and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            await clearAllData();
            setBusy(false);
            Alert.alert('Done', 'Data cleared. Restart the app to re-seed sample data.');
          },
        },
      ],
    );
  };

  return (
    <Screen rail={false}>
      <View className="flex-row items-center border-b border-bordersoft p-4">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={26} color={c.sub} />
        </Pressable>
        <Text className="ml-1 text-md font-bold tracking-tight text-ink">Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Container>
        {/* Appearance */}
        <FadeIn index={0}>
          <SectionLabel icon="color-palette" label="APPEARANCE" />
          <Card className="mb-5">
            <Text className="text-md text-ink">Theme</Text>
            <Text className="mb-3 text-xs text-muted">Choose what's easiest on your eyes</Text>
            <View className="flex-row gap-2">
              {THEMES.map((t) => {
                const active = settings.themePref === t.value;
                return (
                  <PressableScale
                    key={t.value}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      updateSettings({ themePref: t.value });
                    }}
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.label} theme`}
                    accessibilityState={{ selected: active }}
                    className={`flex-1 items-center rounded-card border py-3 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft bg-surface'}`}
                  >
                    <Ionicons name={t.icon} size={20} color={active ? c.amber : c.sub} />
                    <Text className={`mt-1.5 text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>{t.label}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </Card>
        </FadeIn>

        {/* Kwagi */}
        <FadeIn index={1}>
          <SectionLabel icon="happy" label="KWAGI" />
          <Card className="mb-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-md text-ink">Animations</Text>
                <Text className="text-xs text-muted">Owl breathing, glows, and smooth transitions</Text>
              </View>
              <Switch
                value={settings.kwagiAnimations}
                onValueChange={(v) => updateSettings({ kwagiAnimations: v })}
                trackColor={{ true: c.amber, false: c.border }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        </FadeIn>

        {/* Study */}
        <FadeIn index={2}>
          <SectionLabel icon="book" label="STUDY" />
          <Card className="mb-5">
            <Text className="text-md text-ink">Daily Goal (cards)</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {GOALS.map((g) => {
                const active = settings.dailyGoal === g;
                return (
                  <PressableScale
                    key={g}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setDailyGoal(g);
                    }}
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Daily goal ${g}`}
                    className={`rounded-pill border px-4 py-2 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft'}`}
                  >
                    <Text className={active ? 'font-bold text-amber' : 'text-sub'}>{g}</Text>
                  </PressableScale>
                );
              })}
            </View>

            <Text className="mb-2 mt-4 text-md text-ink">Active Board</Text>
            <View className="flex-row flex-wrap gap-2">
              {BOARD_LIST.map((b) => {
                const active = settings.activeBoard === b.id;
                return (
                  <PressableScale
                    key={b.id}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setActiveBoard(b.id as BoardId);
                    }}
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={b.name}
                    className={`flex-row items-center rounded-pill border px-3.5 py-2 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft'}`}
                  >
                    <Ionicons name={b.icon} size={15} color={active ? c.amber : c.sub} />
                    <Text className={`ml-1.5 ${active ? 'font-bold text-amber' : 'text-sub'}`}>{b.id}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </Card>
        </FadeIn>

        {/* AI */}
        <FadeIn index={3}>
          <SectionLabel icon="sparkles" label="AI" />
          <Card className="mb-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-md text-ink">AI Features</Text>
                <Text className="text-xs text-muted">Chat, quiz-gen, summarize (needs API key — coming soon)</Text>
              </View>
              <Switch
                value={settings.aiEnabled}
                onValueChange={(v) => updateSettings({ aiEnabled: v })}
                trackColor={{ true: c.amber, false: c.border }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Card>
        </FadeIn>

        {/* Data */}
        <FadeIn index={4}>
          <SectionLabel icon="server" label="DATA" />
          <Card className="mb-5">
            <Pressable className="flex-row items-center" onPress={confirmClear} disabled={busy} accessibilityRole="button" accessibilityLabel="Clear all data">
              <Ionicons name="trash" size={18} color={c.coral} />
              <Text className="ml-2 text-md text-coral">{busy ? 'Clearing...' : 'Clear all data'}</Text>
            </Pressable>
          </Card>
        </FadeIn>

        {/* About */}
        <FadeIn index={5}>
          <SectionLabel icon="information-circle" label="ABOUT" />
          <Card>
            <Text className="text-md font-bold tracking-tight text-ink">Kwagi — Your Study Buddy</Text>
            <Text className="mt-1 text-xs text-sub">v1.0.0</Text>
            <Text className="mt-2 text-xs text-muted">
              Kwagi is inspired by the Philippine Kwago (Barn Owl).
            </Text>
          </Card>
        </FadeIn>
        </Container>
      </ScrollView>
    </Screen>
  );
}
