import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { FadeIn } from '@/components/ui/FadeIn';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { getTotals, getStreak, type ProgressTotals } from '@/lib/db/progress';
import { countSessions } from '@/lib/db/quiz';
import { getLevel, LEVELS } from '@/constants/levels';
import { formatDuration } from '@/lib/date';
import { useThemeColors } from '@/hooks/useTheme';

export default function ProgressScreen() {
  const { settings } = useAppStore();
  const c = useThemeColors();
  const [totals, setTotals] = useState<ProgressTotals | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [t, s, sess] = await Promise.all([getTotals(), getStreak(), countSessions()]);
        if (!alive) return;
        setTotals(t);
        setStreak(s);
        setSessions(sess);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const xp = totals?.totalXp ?? 0;
  const level = getLevel(xp);
  const accuracy = totals?.accuracy ?? 0;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <FadeIn index={0}>
          <Text className="mb-4 text-2xl font-extrabold tracking-tighter text-ink">Progress</Text>
        </FadeIn>

        {/* Kwagi summary */}
        <FadeIn index={1}>
          <Card elevated className="mb-5 flex-row items-center" glow={c.amber}>
            <KwagiOwl mood={streak >= 7 ? 'excited' : 'happy'} size={88} animate={settings.kwagiAnimations} />
            <View className="ml-3 flex-1">
              <Badge label={`${level.level.badge} ${level.level.name}`} color={c.amber} />
              <Text className="mt-1 text-xl font-extrabold tracking-tight text-ink">{xp} XP</Text>
              <View className="mt-2">
                <ProgressBar progress={level.progress} color={c.amber} height={8} />
              </View>
              <Text className="mt-1 text-xs text-sub">
                {level.nextLevel
                  ? `${level.xpForNext} XP to ${level.nextLevel.name}`
                  : 'Max level — Board Passer ka na! 🎓'}
              </Text>
            </View>
          </Card>
        </FadeIn>

        {/* Streak */}
        <FadeIn index={2}>
          <Card className="mb-5 items-center" glow={streak >= 7 ? c.coral : undefined}>
            <Text className="text-sm text-sub">Current Streak</Text>
            <View className="mt-1 flex-row items-center">
              <Ionicons name="flame" size={28} color={c.coral} />
              <Text className="ml-1.5 text-3xl font-extrabold tracking-tighter text-amber">{streak}</Text>
            </View>
            <Text className="mt-1 text-xs text-muted">
              {streak >= 7 ? 'Sunog na sunog! Tuloy lang!' : 'Mag-aral araw-araw para tumaas!'}
            </Text>
          </Card>
        </FadeIn>

        {/* Stats grid */}
        <FadeIn index={3}>
          <View className="mb-5 flex-row flex-wrap gap-3">
            <Stat icon="albums" label="Cards Studied" value={String(totals?.totalCardsStudied ?? 0)} tint={c.teal} />
            <Stat icon="checkmark-done" label="Accuracy" value={`${accuracy}%`} tint={accuracy >= 80 ? c.green : accuracy >= 60 ? c.amber : c.coral} />
            <Stat icon="time" label="Study Time" value={formatDuration(totals?.totalStudySeconds ?? 0)} tint={c.indigo} />
            <Stat icon="help-circle" label="Questions" value={String(totals?.totalQuestions ?? 0)} tint={c.purple} />
            <Stat icon="school" label="Quizzes Done" value={String(sessions)} tint={c.amber} />
            <Stat icon="flash" label="Total XP" value={String(xp)} tint={c.amber} />
          </View>
        </FadeIn>

        {/* Level path */}
        <FadeIn index={4}>
          <Text className="mb-2 text-md font-bold tracking-tight text-ink">Levels</Text>
          <Card>
            {LEVELS.map((lvl, i) => {
              const reached = xp >= lvl.minXp;
              const current = i === level.levelIndex;
              return (
                <View
                  key={lvl.name}
                  className={`flex-row items-center justify-between py-2.5 ${i < LEVELS.length - 1 ? 'border-b border-bordersoft' : ''}`}
                >
                  <View className="flex-row items-center">
                    <Text className="text-lg">{lvl.badge}</Text>
                    <Text className={`ml-2 text-md ${current ? 'font-extrabold text-amber' : reached ? 'text-ink' : 'text-muted'}`}>
                      {lvl.name}
                    </Text>
                    {current && <Text className="ml-2 text-xs text-amber">← ikaw</Text>}
                  </View>
                  <Text className="text-xs text-sub">{lvl.minXp}+ XP</Text>
                </View>
              );
            })}
          </Card>
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  icon,
  label,
  value,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint?: string;
}) {
  const c = useThemeColors();
  const color = tint ?? c.ink;
  return (
    <View className="min-w-[30%] flex-1 basis-[30%] items-center rounded-card border border-bordersoft bg-surface p-3">
      <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1F` }}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text className="mt-1.5 text-lg font-extrabold tracking-tight" style={{ color }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-center text-xs text-sub">{label}</Text>
    </View>
  );
}
