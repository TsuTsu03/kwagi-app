import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View, Pressable } from 'react-native';
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
import { ProgressBar } from '@/components/ui/ProgressBar';
import { IconBadge, type IconName } from '@/components/ui/IconBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAppStore } from '@/lib/store';
import { getLevel } from '@/constants/levels';
import { formatDate } from '@/lib/date';
import { getStreak, getToday, getTotals } from '@/lib/db/progress';
import { countDue, listFlashcards } from '@/lib/db/flashcards';
import { listSubjects } from '@/lib/db/notes';
import { getCoachAdvice, type CoachAdvice } from '@/lib/coach';
import { useKwagiMood } from '@/hooks/useKwagiMood';
import { useThemeColors } from '@/hooks/useTheme';
import { useTablet } from '@/hooks/useTablet';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type Dashboard = {
  streak: number;
  xpToday: number;
  totalXp: number;
  itemsToday: number;
  studySeconds: number;
  due: number;
  hasCards: boolean;
  noteCount: number;
};

export default function HomeScreen() {
  const { settings } = useAppStore();
  const c = useThemeColors();
  const { isLargeTablet, width } = useTablet();
  const animate = useAnimationsEnabled();
  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    setLoadError(false);
    try {
      const [streak, today, totals, due, cards, subjects] = await Promise.all([
        getStreak(), getToday(), getTotals(), countDue(),
        listFlashcards({ limit: 1, includeSuspended: true }), listSubjects(),
      ]);
      if (current !== request.current) return;
      setData({
        streak, xpToday: today.xp_earned, totalXp: totals.totalXp,
        itemsToday: today.cards_studied + today.questions_answered,
        studySeconds: today.study_time_seconds, due, hasCards: cards.length > 0,
        noteCount: subjects.reduce((sum, subject) => sum + subject.note_count, 0),
      });
    } catch {
      if (current === request.current) setLoadError(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { request.current += 1; };
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await load(); }
    finally { setRefreshing(false); }
  }, [load]);

  const goal = settings.dailyGoal;
  const goalPct = data && goal > 0 ? Math.min(1, data.itemsToday / goal) : 0;
  const advice = data ? getCoachAdvice({
    studySecondsToday: data.studySeconds, lastStudyAt: settings.lastStudyAt, streak: data.streak,
  }) : null;
  const isNew = data && !data.hasCards && data.noteCount === 0;
  const primaryLabel = data?.due ? `Review ${data.due} due ${data.due === 1 ? 'card' : 'cards'}`
    : data?.hasCards ? 'Open your cards' : data?.noteCount ? 'Make cards from notes' : 'Create your first note';
  const openStudy = () => {
    if (data?.due) router.navigate({ pathname: '/quiz', params: { mode: 'review' } });
    else if (data?.hasCards) router.navigate('/cards');
    else router.navigate('/notes');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: isLargeTablet ? 32 : 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.amber} colors={[c.amber]} progressBackgroundColor={c.surface} />}
      >
        <Container wide>
          <FadeIn>
            <View className="mb-6 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-sm text-sub">{greeting()}{settings.studentName ? `, ${settings.studentName}` : ''}</Text>
                <Text accessibilityRole="header" className="mt-1 text-2xl font-extrabold tracking-tighter text-ink">Your study desk</Text>
                <Text className="mt-1 text-sm text-muted">{settings.course ? `${settings.course} · ` : ''}{formatDate()}</Text>
              </View>
              <Pressable
                accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')}
                className="h-12 w-12 items-center justify-center rounded-2xl border border-bordersoft bg-surface"
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Ionicons name="settings-outline" size={22} color={c.sub} />
              </Pressable>
            </View>
          </FadeIn>

          {loadError && (
            <Card className="mb-4">
              <Text accessibilityRole="alert" className="text-base text-coral">Your study overview could not load.</Text>
              <Text className="mt-1 text-sm text-sub">{data ? 'The figures below are from your last successful refresh.' : 'Try again to see your cards and progress.'}</Text>
              <Button label="Try again" variant="secondary" onPress={() => void load()} className="mt-3" />
            </Card>
          )}
          {!data && !loadError && (
            <View className="items-center gap-3 py-12" accessibilityLabel="Loading your study overview">
              <ActivityIndicator color={c.amber} />
              <Text className="text-base text-sub">Opening your study desk…</Text>
            </View>
          )}
          {data && advice && (
            <>
              <FadeIn index={1}>
                <Card className="mb-6" style={{ padding: isLargeTablet ? 28 : 20, borderColor: c.amberDim }}>
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-amber">{data.due > 0 ? 'READY TO REVIEW' : isNew ? 'START HERE' : 'YOUR NEXT STEP'}</Text>
                      <Text accessibilityRole="header" className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
                        {data.due > 0 ? 'Ready when you are.' : isNew ? 'Make your first topic stick.' : data.hasCards ? 'Your review queue is clear.' : 'Turn notes into practice.'}
                      </Text>
                      <Text className="mt-3 text-base leading-6 text-sub">
                        {data.due > 0 ? `${data.due} ${data.due === 1 ? 'card is' : 'cards are'} ready. Start with the ones due now.`
                          : isNew ? 'Add a subject and a note, then turn the key ideas into flashcards.'
                          : data.hasCards ? 'Manage your cards or add a new topic while you wait for your next review.'
                          : 'Open a note and turn its key ideas into flashcards for your next review.'}
                      </Text>
                    </View>
                    {width >= 390 && <View className="ml-3"><KwagiOwl mood={isNew ? 'happy' : advice.mood} size={isLargeTablet ? 136 : 84} animate={animate} /></View>}
                  </View>
                  <View className="mt-5" style={isLargeTablet ? { alignSelf: 'flex-start', minWidth: 280 } : undefined}>
                    <Button label={primaryLabel} onPress={openStudy} icon={<Ionicons name={data.due ? 'play' : 'arrow-forward'} size={18} color={c.bg} />} />
                  </View>
                </Card>
              </FadeIn>

              <View style={{ flexDirection: isLargeTablet ? 'row' : 'column', gap: 24, alignItems: 'stretch' }}>
                <View style={{ flex: isLargeTablet ? 1.15 : undefined, minWidth: 0 }}>
                  <FadeIn index={2}>
                    <SectionHeader title="Today’s progress" />
                    <Card>
                      <View className="flex-row flex-wrap items-center justify-between gap-2">
                        <Text className="text-md font-bold text-ink">Daily goal</Text>
                        <Text className="text-sm font-semibold text-sub">{data.itemsToday} / {goal} study items</Text>
                      </View>
                      <View className="mt-4"><ProgressBar progress={goalPct} color={goalPct >= 1 ? c.green : c.amber} /></View>
                      <Text className="mt-3 text-sm leading-5 text-sub">
                        {goalPct >= 1 ? 'Your daily goal is complete. Take a moment to recharge.' : `${Math.max(0, goal - data.itemsToday)} more to reach your goal. Card reviews and quiz answers both count.`}
                      </Text>
                      <View className="my-5 h-px bg-bordersoft" />
                      <View className="flex-row gap-3">
                        <Stat value={`${data.streak}`} label="day streak" icon="flame-outline" />
                        <Stat value={`${data.xpToday}`} label="XP today" icon="flash-outline" />
                        <Stat value={getLevel(data.totalXp).level.name} label="current level" icon="ribbon-outline" />
                      </View>
                    </Card>
                    <View className="mt-4"><CoachBlock advice={advice} animate={animate} /></View>
                  </FadeIn>
                </View>
                <View style={{ flex: isLargeTablet ? 1 : undefined, minWidth: 0 }}>
                  <FadeIn index={3}>
                    <SectionHeader title="Keep learning" />
                    <View className="gap-3">
                      <QuickAction icon="document-text-outline" label="Your notes" hint={data.noteCount ? `${data.noteCount} ${data.noteCount === 1 ? 'note' : 'notes'} across your subjects` : 'Build a reviewer, one topic at a time'} tint={c.teal} onPress={() => router.navigate('/notes')} />
                      <QuickAction icon="albums-outline" label="Your flashcards" hint="Create, edit, and organize your cards" tint={c.purple} onPress={() => router.navigate('/cards')} />
                      <QuickAction icon="school-outline" label="Practice questions" hint="Choose a subject and test your recall" tint={c.amber} onPress={() => router.navigate('/quiz')} />
                      <QuickAction icon="stats-chart-outline" label="Your progress" hint="See your activity and study history" tint={c.green} onPress={() => router.navigate('/progress')} />
                    </View>
                  </FadeIn>
                </View>
              </View>
            </>
          )}
        </Container>
      </ScrollView>
    </Screen>
  );
}

function CoachBlock({ advice, animate }: { advice: CoachAdvice; animate: boolean }) {
  const c = useThemeColors();
  const { mood, setBase, flash } = useKwagiMood(advice.mood);
  useFocusEffect(useCallback(() => { setBase(advice.mood); }, [advice.mood, setBase]));
  return (
    <View className="flex-row items-start rounded-card border border-bordersoft p-4">
      <PressableScale onPress={() => flash('excited', 1100)} pressedScale={animate ? 0.96 : 1} accessibilityRole="button" accessibilityLabel="Say hello to Kwagi">
        <KwagiOwl mood={mood} size={60} animate={animate} />
      </PressableScale>
      <View className="ml-2 flex-1">
        <Text className="text-sm font-semibold" style={{ color: c[advice.accent] }}>{advice.title}</Text>
        <Text className="mt-1 text-sm leading-5 text-sub">{advice.message}</Text>
      </View>
    </View>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: IconName }) {
  const c = useThemeColors();
  return (
    <View className="flex-1">
      <Ionicons name={icon} size={19} color={c.amber} />
      <Text className="mt-2 text-md font-bold text-ink">{value}</Text>
      <Text className="mt-1 text-xs text-muted">{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, hint, tint, onPress }: { icon: IconName; label: string; hint: string; tint: string; onPress: () => void }) {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  return (
    <PressableScale onPress={onPress} pressedScale={animate ? 0.96 : 1} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint}
      className="min-h-[88px] flex-row items-center rounded-2xl border border-bordersoft bg-surface p-4">
      <IconBadge name={icon} color={tint} box={44} />
      <View className="mx-3 flex-1">
        <Text className="text-base font-bold text-ink">{label}</Text>
        <Text className="mt-1 text-sm leading-5 text-muted">{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muted} />
    </PressableScale>
  );
}
