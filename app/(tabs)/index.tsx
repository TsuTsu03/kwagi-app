import { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { FadeIn } from '@/components/ui/FadeIn';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useAppStore } from '@/lib/store';
import { BOARD_LIST, BOARDS, type BoardId } from '@/constants/boards';
import { getLevel } from '@/constants/levels';
import { filipinoDate } from '@/lib/date';
import { getStreak, getToday, getTotals } from '@/lib/db/progress';
import { countDue } from '@/lib/db/flashcards';
import { getCoachAdvice, type CoachAdvice } from '@/lib/coach';
import { useThemeColors } from '@/hooks/useTheme';
import { useTablet } from '@/hooks/useTablet';

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

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [s, today, totals, dueCount] = await Promise.all([
          getStreak(),
          getToday(),
          getTotals(),
          countDue(),
        ]);
        if (!alive) return;
        setStreak(s);
        setXpToday(today.xp_earned);
        setCardsToday(today.cards_studied + today.questions_answered);
        setStudySeconds(today.study_time_seconds);
        setTotalXp(totals.totalXp);
        setDue(dueCount);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const advice = getCoachAdvice({
    studySecondsToday: studySeconds,
    lastStudyAt: settings.lastStudyAt,
    streak,
  });
  const level = getLevel(totalXp);
  const goal = settings.dailyGoal;
  const goalPct = goal > 0 ? Math.min(1, cardsToday / goal) : 0;
  const activeBoard = settings.activeBoard;
  const owlSize = isTablet ? 132 : 104;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <FadeIn index={0}>
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="text-3xl font-extrabold tracking-tighter text-amber">Kwagi</Text>
              <Text className="mt-0.5 text-sm text-sub">{filipinoDate()}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              onPress={() => router.push('/settings')}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface border border-bordersoft"
            >
              <Ionicons name="settings-outline" size={22} color={c.sub} />
            </Pressable>
          </View>
        </FadeIn>

        {/* Kwagi coach — the study friend */}
        <FadeIn index={1}>
          <CoachBlock advice={advice} owlSize={owlSize} animate={settings.kwagiAnimations} />
        </FadeIn>

        {/* Stats row */}
        <FadeIn index={2}>
          <View className="mb-5 mt-5 flex-row gap-3">
            <StatCard icon="flame" tint={c.coral} value={String(streak)} label="Streak" glow={streak >= 7 ? c.coral : undefined} />
            <StatCard icon="flash" tint={c.amber} value={String(xpToday)} label="XP Today" />
            <StatCard badge={level.level.badge} value={level.level.name} label="Level" small />
          </View>
        </FadeIn>

        {/* Today's goal */}
        <FadeIn index={3}>
          <Card className="mb-5" glow={goalPct >= 1 ? c.green : undefined}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-md font-bold tracking-tight text-ink">Today's Goal</Text>
              <Text className="text-sm text-sub">
                {cardsToday}/{goal} cards
              </Text>
            </View>
            <ProgressBar progress={goalPct} color={c.green} />
            <Text className="mt-2 text-sm text-sub">
              {goalPct >= 1
                ? 'Tapos na! Idol! 🎉'
                : goalPct >= 0.5
                  ? `${Math.round(goalPct * 100)}% — Konti na lang! 💪`
                  : `${Math.round(goalPct * 100)}% — Kaya pa! Tuloy lang.`}
            </Text>
          </Card>
        </FadeIn>

        {/* Quick actions */}
        <FadeIn index={4}>
          <View className="mb-5 flex-row flex-wrap gap-3">
            <QuickAction icon="school" label="Start Quiz" tint={c.amber} onPress={() => router.navigate('/quiz')} />
            <QuickAction icon="chatbubble-ellipses" label="Ask Kwagi" tint={c.purple} onPress={() => router.navigate('/chat')} />
            <QuickAction icon="document-text" label="My Notes" tint={c.teal} onPress={() => router.navigate('/notes')} />
            <QuickAction icon="stats-chart" label="Progress" tint={c.green} onPress={() => router.navigate('/progress')} />
          </View>
        </FadeIn>

        {/* Due for review */}
        <FadeIn index={5}>
          <Card className="mb-5" glow={due > 0 ? c.amber : undefined}>
            <View className="flex-row items-center justify-between">
              <Text className="text-md font-bold tracking-tight text-ink">Due for Review</Text>
              <View className="rounded-pill bg-amber px-2.5 py-1">
                <Text className="text-xs font-bold text-bg">{due} cards</Text>
              </View>
            </View>
            <Text className="mt-2 text-sm text-sub">
              {due > 0 ? 'May mga card na due ngayon. Tara, balikan natin!' : 'Wala pang due — good job!'}
            </Text>
            {due > 0 && (
              <Pressable
                onPress={() => router.navigate('/quiz')}
                accessibilityRole="button"
                accessibilityLabel="Review due cards"
                className="mt-3 flex-row items-center self-start rounded-pill bg-amberdim px-4 py-2"
              >
                <Text className="text-sm font-bold text-amber">Review now</Text>
                <Ionicons name="arrow-forward" size={15} color={c.amber} style={{ marginLeft: 4 }} />
              </Pressable>
            )}
          </Card>
        </FadeIn>

        {/* Board selector */}
        <FadeIn index={6}>
          <Text className="mb-2 text-md font-bold tracking-tight text-ink">Anong exam?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {BOARD_LIST.map((b) => {
              const active = b.id === activeBoard;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setActiveBoard(b.id as BoardId)}
                  accessibilityRole="button"
                  accessibilityLabel={b.name}
                  className={`rounded-pill border px-4 py-2 ${active ? 'border-amber bg-amberdim' : 'border-bordersoft bg-surface'}`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-amber' : 'text-sub'}`}>
                    {b.icon} {b.id}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text className="mt-2 text-xs text-muted">{BOARDS[activeBoard].name}</Text>
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}

function CoachBlock({ advice, owlSize, animate }: { advice: CoachAdvice; owlSize: number; animate: boolean }) {
  const c = useThemeColors();
  const accent = c[advice.accent];
  return (
    <Card glow={accent}>
      <View className="flex-row items-start">
        <KwagiOwl mood={advice.mood} size={owlSize} animate={animate} />
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

function StatCard({
  icon,
  badge,
  tint,
  value,
  label,
  small = false,
  glow,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  badge?: string;
  tint?: string;
  value: string;
  label: string;
  small?: boolean;
  glow?: string;
}) {
  const c = useThemeColors();
  const iconTint = tint ?? c.ink;
  return (
    <Card elevated className="flex-1 items-center" glow={glow}>
      {icon ? (
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${iconTint}1F` }}>
          <Ionicons name={icon} size={20} color={iconTint} />
        </View>
      ) : (
        <Text className="text-2xl">{badge}</Text>
      )}
      <Text className={`mt-1.5 font-extrabold tracking-tight text-ink ${small ? 'text-sm' : 'text-xl'}`} numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-xs text-sub">{label}</Text>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="min-h-[92px] flex-1 basis-[46%] items-start justify-between rounded-card border border-bordersoft bg-surface p-4"
      style={{
        shadowColor: c.shadow,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
      }}
    >
      <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}1F` }}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text className="mt-2 text-md font-bold tracking-tight text-ink">{label}</Text>
    </Pressable>
  );
}
