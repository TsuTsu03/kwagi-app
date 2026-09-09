import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { FadeIn } from '@/components/ui/FadeIn';
import { Card } from '@/components/ui/Card';
import { CountUp } from '@/components/ui/CountUp';
import { AnimatedRing } from '@/components/ui/AnimatedRing';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IconBadge, type IconName } from '@/components/ui/IconBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { getTotals, getStreak, getRecentDays, type DailyStat, type ProgressTotals } from '@/lib/db/progress';
import { countSessions } from '@/lib/db/quiz';
import { getLevel, LEVELS } from '@/constants/levels';
import { formatDuration } from '@/lib/date';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export default function ProgressScreen() {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const [totals, setTotals] = useState<ProgressTotals | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [week, setWeek] = useState<DailyStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [t, s, sess, w] = await Promise.all([getTotals(), getStreak(), countSessions(), getRecentDays(7)]);
      setTotals(t);
      setStreak(s);
      setSessions(sess);
      setWeek(w);
    } catch {
      setLoadError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        if (alive) await load();
      })();
      return () => {
        alive = false;
      };
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await load(); }
    finally { setRefreshing(false); }
  }, [load]);

  const xp = totals?.totalXp ?? 0;
  const level = getLevel(xp);
  const accuracy = totals?.accuracy ?? 0;
  const accuracyTint = accuracy >= 80 ? c.green : accuracy >= 60 ? c.amber : c.coral;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.amber}
            colors={[c.amber]}
            progressBackgroundColor={c.surface}
          />
        }
      >
        <Container>
        <FadeIn index={0}>
          <Text className="mb-4 text-2xl font-extrabold tracking-tighter text-ink">Progress</Text>
        </FadeIn>
        {loadError && <Card className="mb-4"><Text className="text-sm text-coral">Progress could not load. Your study data was not deleted.</Text><PressableScale onPress={() => void load()} accessibilityRole="button" className="mt-2 min-h-11 justify-center"><Text className="font-bold text-amber">Try again</Text></PressableScale></Card>}

        {/* Kwagi summary */}
        <FadeIn index={1}>
          <Card elevated className="mb-5 flex-row items-center" glow={c.amber}>
            <KwagiOwl mood={streak >= 7 ? 'excited' : 'happy'} size={88} animate={animate} />
            <View className="ml-3 flex-1">
              <View
                className="flex-row items-center self-start rounded-pill px-2.5 py-1"
                style={{ backgroundColor: `${c.amber}22`, borderWidth: 1, borderColor: `${c.amber}33` }}
              >
                <Ionicons name={level.level.icon} size={12} color={c.amber} />
                <Text className="ml-1 text-xs font-semibold tracking-tight text-amber">{level.level.name}</Text>
              </View>
              <CountUp
                value={xp}
                format={(n) => `${n} XP`}
                className="mt-1.5 text-xl font-extrabold tracking-tight text-ink"
              />
              <View className="mt-2">
                <ProgressBar progress={level.progress} color={c.amber} height={8} />
              </View>
              <Text className="mt-1 text-xs text-sub">
                {level.nextLevel
                  ? `${level.xpForNext} XP to ${level.nextLevel.name}`
                  : 'Highest study level reached!'}
              </Text>
            </View>
          </Card>
        </FadeIn>

        {/* Streak + accuracy — two dynamic focal cards side by side */}
        <FadeIn index={2}>
          <View className="mb-5 flex-row gap-3">
            <Card className="flex-1 items-center justify-center" glow={streak >= 7 ? c.coral : undefined}>
              <Text className="text-sm text-sub">Streak</Text>
              <View className="mt-1 flex-row items-center">
                <Ionicons name="flame" size={26} color={c.coral} />
                <CountUp
                  value={streak}
                  className="ml-1.5 text-3xl font-extrabold tracking-tighter text-amber"
                />
              </View>
              <Text className="mt-1 text-center text-xs text-muted">
                {streak >= 7 ? 'On fire, keep it up!' : 'Study daily to grow it.'}
              </Text>
            </Card>
            <Card className="flex-1 items-center justify-center">
              <AnimatedRing
                progress={accuracy / 100}
                size={104}
                stroke={9}
                color={accuracyTint}
                colorTo={accuracyTint}
              >
                <View className="items-center">
                  <CountUp
                    value={accuracy}
                    format={(n) => `${n}%`}
                    className="text-xl font-extrabold tracking-tight"
                    style={{ color: accuracyTint }}
                  />
                  <Text className="text-xs text-sub">Accuracy</Text>
                </View>
              </AnimatedRing>
            </Card>
          </View>
        </FadeIn>

        {/* This week — XP per day at a glance */}
        <FadeIn index={3}>
          <SectionHeader title="This week" />
          <Card className="mb-5">
            <WeekChart days={week} />
          </Card>
        </FadeIn>

        {/* Stats grid */}
        <FadeIn index={4}>
          <SectionHeader title="Statistics" />
          <View className="mb-5 flex-row flex-wrap gap-3">
            <Stat icon="albums" label="Cards Studied" value={totals?.totalCardsStudied ?? 0} tint={c.teal} />
            <Stat icon="time" label="Study Time" value={formatDuration(totals?.totalStudySeconds ?? 0)} tint={c.indigo} />
            <Stat icon="help-circle" label="Questions" value={totals?.totalQuestions ?? 0} tint={c.purple} />
            <Stat icon="school" label="Quizzes Done" value={sessions} tint={c.amber} />
            <Stat icon="flash" label="Total XP" value={xp} tint={c.amber} />
            <Stat icon="trophy" label="Level" value={level.level.name} tint={c.purple} />
          </View>
        </FadeIn>

        {/* Level path — a connected climb from Freshie to Board Passer */}
        <FadeIn index={5}>
          <SectionHeader title="Level path" />
          <Card>
            <View className="relative">
              {/* vertical track behind the nodes */}
              <View className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />
              {LEVELS.map((lvl, i) => {
                const reached = xp >= lvl.minXp;
                const current = i === level.levelIndex;
                const done = reached && !current;
                const nodeBg = current ? c.amber : done ? c.teal : c.surface;
                const nodeIcon = done ? 'checkmark' : current ? lvl.icon : 'lock-closed';
                const iconColor = current || done ? c.bg : c.muted;
                return (
                  <View
                    key={lvl.name}
                    className={`relative z-10 flex-row items-center ${i < LEVELS.length - 1 ? 'mb-4' : ''}`}
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-full border-4"
                      style={{
                        backgroundColor: nodeBg,
                        borderColor: c.surface,
                        ...(current
                          ? {
                              shadowColor: c.amber,
                              shadowOpacity: 0.5,
                              shadowRadius: 10,
                              shadowOffset: { width: 0, height: 0 },
                              elevation: 6,
                            }
                          : null),
                      }}
                    >
                      <Ionicons name={nodeIcon} size={18} color={iconColor} />
                    </View>
                    <View className="ml-3 flex-1 flex-row items-center justify-between">
                      <Text
                        className={`text-md ${current ? 'font-extrabold text-amber' : done ? 'text-ink' : 'text-muted'}`}
                      >
                        {lvl.name}
                      </Text>
                      {current ? (
                        <View className="rounded-pill bg-amberdim px-2 py-0.5">
                          <Text className="text-xs font-bold tracking-tight text-amber">Current</Text>
                        </View>
                      ) : (
                        <Text className="text-xs text-sub">{lvl.minXp}+ XP</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        </FadeIn>
        </Container>
      </ScrollView>
    </Screen>
  );
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function WeekChart({ days }: { days: DailyStat[] }) {
  const c = useThemeColors();
  const max = Math.max(1, ...days.map((d) => d.xp_earned));
  const weekXp = days.reduce((sum, d) => sum + d.xp_earned, 0);
  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm text-sub">XP earned per day</Text>
        <Text className="text-sm font-bold tracking-tight text-amber">{weekXp} XP</Text>
      </View>
      <View className="h-24 flex-row items-end justify-between gap-2">
        {days.map((d, i) => {
          const isToday = i === days.length - 1;
          const active = d.xp_earned > 0;
          const h = active ? Math.max(0.12, d.xp_earned / max) : 0.06;
          return (
            <View key={d.date} className="flex-1 items-center">
              <View
                className="w-full rounded-md"
                style={{
                  height: `${Math.round(h * 100)}%`,
                  backgroundColor: active ? (isToday ? c.amber : `${c.amber}88`) : c.border,
                }}
              />
              <Text className={`mt-1.5 text-xs ${isToday ? 'font-bold text-amber' : 'text-muted'}`}>
                {DAY_LABELS[new Date(`${d.date}T12:00:00`).getDay()]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
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
  value: number | string;
  tint?: string;
}) {
  const c = useThemeColors();
  const color = tint ?? c.ink;
  return (
    <View className="min-w-[30%] flex-1 basis-[30%] items-center rounded-card border border-bordersoft bg-surface p-3">
      <IconBadge name={icon as IconName} color={color} box={32} size={16} />
      {typeof value === 'number' ? (
        <CountUp value={value} className="mt-1.5 text-lg font-extrabold tracking-tight" style={{ color }} />
      ) : (
        <Text className="mt-1.5 text-lg font-extrabold tracking-tight" style={{ color }}>
          {value}
        </Text>
      )}
      <Text className="mt-0.5 text-center text-xs text-sub">{label}</Text>
    </View>
  );
}
