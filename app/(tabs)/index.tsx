import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { FadeIn } from '@/components/ui/FadeIn';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { CountUp } from '@/components/ui/CountUp';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IconBadge, type IconName } from '@/components/ui/IconBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store';
import { BOARD_LIST, BOARDS, type BoardId } from '@/constants/boards';
import { getLevel } from '@/constants/levels';
import { formatDate } from '@/lib/date';
import { getStreak, getToday, getTotals } from '@/lib/db/progress';
import { countDue } from '@/lib/db/flashcards';
import { getCoachAdvice, type CoachAdvice } from '@/lib/coach';
import { useKwagiMood } from '@/hooks/useKwagiMood';
import { useThemeColors } from '@/hooks/useTheme';
import { useTablet } from '@/hooks/useTablet';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { settings, setActiveBoard } = useAppStore();
  const c = useThemeColors();
  const { isTablet } = useTablet();
  const [streak, setStreak] = useState(0);
  const [xpToday, setXpToday] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [cardsToday, setCardsToday] = useState(0);
  const [studySeconds, setStudySeconds] = useState(0);
  const [due, setDue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, today, totals, dueCount] = await Promise.all([
      getStreak(),
      getToday(),
      getTotals(),
      countDue(),
    ]);
    setStreak(s);
    setXpToday(today.xp_earned);
    setCardsToday(today.cards_studied + today.questions_answered);
    setStudySeconds(today.study_time_seconds);
    setTotalXp(totals.totalXp);
    setDue(dueCount);
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
    await load();
    setRefreshing(false);
  }, [load]);

  const advice = getCoachAdvice({
    studySecondsToday: studySeconds,
    lastStudyAt: settings.lastStudyAt,
    streak,
  });
  const level = getLevel(totalXp);
  const goal = settings.dailyGoal;
  const goalPct = goal > 0 ? Math.min(1, cardsToday / goal) : 0;
  const activeBoard = settings.activeBoard;
  const owlSize = isTablet ? 124 : 96;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
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
        {/* Header */}
        <FadeIn index={0}>
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-sm text-sub">{greeting()}</Text>
              <Text className="mt-0.5 text-3xl font-extrabold tracking-tighter text-ink">Kwagi</Text>
              <Text className="mt-0.5 text-sm text-muted">{formatDate()}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
              className="h-11 w-11 items-center justify-center rounded-full border border-bordersoft bg-surface"
            >
              <Ionicons name="settings-outline" size={21} color={c.sub} />
            </Pressable>
          </View>
        </FadeIn>

        {/* Kwagi coach — the study friend */}
        <FadeIn index={1}>
          <CoachBlock advice={advice} owlSize={owlSize} animate={settings.kwagiAnimations} />
        </FadeIn>

        {/* Today */}
        <FadeIn index={2}>
          <SectionHeader title="Today" className="mt-7" />
        </FadeIn>

        {/* Stats — one quiet panel, three columns, no competing glows */}
        <FadeIn index={3}>
          <Card className="mb-4 flex-row items-center">
            <StatColumn icon="flame" tint={c.coral} value={streak} label="Streak" />
            <Divider />
            <StatColumn icon="flash" tint={c.amber} value={xpToday} label="XP today" />
            <Divider />
            <StatColumn icon={level.level.icon} tint={c.purple} value={level.level.name} label="Level" />
          </Card>
        </FadeIn>

        {/* Daily goal */}
        <FadeIn index={4}>
          <Card className="mb-4" glow={goalPct >= 1 ? c.green : undefined}>
            <View className="mb-2.5 flex-row items-center justify-between">
              <Text className="text-md font-bold tracking-tight text-ink">Daily goal</Text>
              <Text className="text-sm font-semibold text-sub">
                {cardsToday}/{goal} cards
              </Text>
            </View>
            <ProgressBar progress={goalPct} color={goalPct >= 1 ? c.green : c.amber} />
            <Text className="mt-2.5 text-sm text-sub leading-5">
              {goalPct >= 1
                ? "Today's goal complete. Great work!"
                : goalPct >= 0.5
                  ? `${Math.round(goalPct * 100)}% — almost there, keep going.`
                  : `${Math.round(goalPct * 100)}% — one step at a time.`}
            </Text>
          </Card>
        </FadeIn>

        {/* Due for review — only emphasized when there's something to do */}
        <FadeIn index={5}>
          <PressableScale
            onPress={() => due > 0 && router.navigate('/quiz')}
            disabled={due === 0}
            haptic={due > 0}
            accessibilityRole="button"
            accessibilityLabel={due > 0 ? 'Review due cards' : 'No cards due'}
          >
            <Card className="mb-4 flex-row items-center" glow={due > 0 ? c.amber : undefined}>
              <IconBadge name="albums" color={due > 0 ? c.amber : c.muted} box={44} />
              <View className="ml-3 flex-1">
                <Text className="text-md font-bold tracking-tight text-ink">Due for review</Text>
                <Text className="mt-0.5 text-sm text-sub leading-5">
                  {due > 0 ? `${due} ${due === 1 ? 'card' : 'cards'} due today` : "Nothing due — you're all caught up!"}
                </Text>
              </View>
              {due > 0 && <Ionicons name="chevron-forward" size={20} color={c.amber} />}
            </Card>
          </PressableScale>
        </FadeIn>

        {/* Quick actions */}
        <FadeIn index={6}>
          <SectionHeader title="Quick actions" className="mt-3" />
          <View className="flex-row flex-wrap gap-3">
            <QuickAction icon="school" label="Quiz" hint="Practice questions" tint={c.amber} onPress={() => router.navigate('/quiz')} />
            <QuickAction icon="chatbubble-ellipses" label="Ask Kwagi" hint="AI study buddy" tint={c.purple} onPress={() => router.navigate('/chat')} />
            <QuickAction icon="document-text" label="Notes" hint="Your reviewer" tint={c.teal} onPress={() => router.navigate('/notes')} />
            <QuickAction icon="stats-chart" label="Progress" hint="Track your stats" tint={c.green} onPress={() => router.navigate('/progress')} />
          </View>
        </FadeIn>

        {/* Board selector */}
        <FadeIn index={7}>
          <SectionHeader title="Exam track" subtitle={BOARDS[activeBoard].name} className="mt-7" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {BOARD_LIST.map((b) => {
              const active = b.id === activeBoard;
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
                  accessibilityState={{ selected: active }}
                  className={`flex-row items-center rounded-pill border px-3.5 py-2.5 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft bg-surface'}`}
                >
                  <Ionicons name={b.icon} size={16} color={active ? c.amber : c.sub} />
                  <Text className={`ml-1.5 text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>{b.id}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </FadeIn>
        </Container>
      </ScrollView>
    </Screen>
  );
}

function CoachBlock({ advice, owlSize, animate }: { advice: CoachAdvice; owlSize: number; animate: boolean }) {
  const c = useThemeColors();
  const accent = c[advice.accent];
  const { mood, setBase, flash } = useKwagiMood(advice.mood);

  // Keep Kwagi's resting mood in sync with the coach's current advice.
  useFocusEffect(
    useCallback(() => {
      setBase(advice.mood);
    }, [advice.mood, setBase]),
  );

  const poke = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flash('excited', 1100);
  }, [flash]);

  return (
    <Card glow={accent}>
      <View className="flex-row items-start">
        <PressableScale
          onPress={poke}
          haptic={false}
          pressedScale={0.9}
          accessibilityRole="button"
          accessibilityLabel="Poke Kwagi"
        >
          <KwagiOwl mood={mood} size={owlSize} animate={animate} />
        </PressableScale>
        <View className="ml-1 flex-1">
          <Text className="text-md font-extrabold tracking-tight" style={{ color: accent }}>
            {advice.title}
          </Text>
          <Text className="mt-1 text-sm text-sub leading-5">{advice.message}</Text>
        </View>
      </View>
      {advice.cta && (
        <View className="mt-3">
          <Button
            label={advice.cta.label}
            onPress={() => router.navigate('/quiz')}
            icon={<Ionicons name="play" size={17} color={c.bg} />}
          />
        </View>
      )}
    </Card>
  );
}

function Divider() {
  return <View className="h-10 w-px bg-bordersoft" />;
}

function StatColumn({
  icon,
  tint,
  value,
  label,
}: {
  icon: IconName;
  tint: string;
  value: number | string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center px-1">
      <IconBadge name={icon} color={tint} box={36} size={18} />
      {typeof value === 'number' ? (
        <CountUp
          value={value}
          className="mt-2 text-lg font-extrabold tracking-tight text-ink"
          numberOfLines={1}
        />
      ) : (
        <Text className="mt-2 text-lg font-extrabold tracking-tight text-ink" numberOfLines={1}>
          {value}
        </Text>
      )}
      <Text className="text-xs text-sub" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  tint,
  onPress,
}: {
  icon: IconName;
  label: string;
  hint: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-[112px] flex-1 basis-[46%] justify-between rounded-card border border-bordersoft bg-surface p-4"
    >
      <IconBadge name={icon} color={tint} box={44} />
      <View>
        <Text className="text-md font-bold tracking-tight text-ink">{label}</Text>
        <Text className="mt-0.5 text-xs text-muted">{hint}</Text>
      </View>
    </PressableScale>
  );
}
