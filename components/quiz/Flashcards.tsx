import { useStudyTimer } from '@/hooks/useStudyTimer';
import { showAlert } from '@/lib/alert';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { getDueCards, reviewCardAndRecord, type Flashcard } from '@/lib/db/flashcards';
import { useAppStore } from '@/lib/store';
import type { SwipeAction } from '@/lib/srs';
import { useThemeColors } from '@/hooks/useTheme';
import type { ThemeColors } from '@/constants/theme';

const RATINGS: { action: SwipeAction; label: string; tint: keyof ThemeColors }[] = [
  { action: 'again', label: 'Again', tint: 'coral' },
  { action: 'hard', label: 'Hard', tint: 'amber' },
  { action: 'good', label: 'Good', tint: 'teal' },
  { action: 'easy', label: 'Easy', tint: 'green' },
];

export function Flashcards({ onExit, animate }: { onExit: () => void; animate: boolean }) {
  const c = useThemeColors();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const flip = useSharedValue(0);
  const [showBack, setShowBack] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rating, setRating] = useState<SwipeAction | null>(null);
  const ratingLock = useRef(false);
  const timer = useStudyTimer();
  const cardStartedAt = useRef(0);

  const load = useCallback(() => {
    let alive = true;
    setCards(null);
    setLoadError(false);
    void getDueCards(30)
      .then((due) => { if (alive) setCards(due); cardStartedAt.current = timer.elapsed(Date.now()); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [timer]);

  useEffect(() => {
    let cancel: (() => void) | undefined;
    const timeout = setTimeout(() => { cancel = load(); }, 0);
    return () => { clearTimeout(timeout); cancel?.(); };
  }, [load]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value * 180}deg` }],
    backfaceVisibility: 'hidden',
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value * 180 + 180}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const doFlip = useCallback(() => {
    if (ratingLock.current) return;
    const to = showBack ? 0 : 1;
    // Reanimated shared values are intentionally mutable animation state.
    // eslint-disable-next-line react-hooks/immutability
    flip.value = withTiming(to, { duration: animate ? 320 : 0 });
    setShowBack(!showBack);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [showBack, flip, animate]);

  const rate = useCallback(
    async (action: SwipeAction) => {
      if (!cards || ratingLock.current) return;
      ratingLock.current = true;
      setRating(action);
      const card = cards[index];
      try {
        const elapsed = timer.elapsed(Date.now());
        await reviewCardAndRecord(card, action, Math.max(1, Math.round((elapsed - cardStartedAt.current) / 1000)));
        cardStartedAt.current = timer.elapsed(Date.now());
        void useAppStore.getState().markStudied().catch(() => undefined);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setReviewed((r) => r + 1);
        // eslint-disable-next-line react-hooks/immutability
        flip.value = 0;
        setShowBack(false);
        setIndex((i) => i + 1);
      } catch {
        showAlert('Could not save review', 'If this card was edited or paused, return to Study and start a new review. Your progress was not changed.');
      } finally {
        ratingLock.current = false;
        setRating(null);
      }
    },
    [cards, index, flip, timer],
  );

  if (loadError) {
    return (
      <Screen>
        <Container className="flex-1 items-center justify-center p-6">
          <KwagiOwl mood="thinking" size={120} animate={animate} />
          <Text className="mt-4 text-center text-md font-bold text-ink">Cards could not load.</Text>
          <Text className="mt-1 text-center text-sm leading-5 text-sub">Your data is still on this device. Try loading it again.</Text>
          <View className="mt-5 w-full gap-3"><Button label="Try again" onPress={load} /><Button label="Back to Study" variant="secondary" onPress={onExit} /></View>
        </Container>
      </Screen>
    );
  }

  if (!cards) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <KwagiOwl mood="thinking" size={120} animate={animate} />
          <Text className="mt-4 text-sub">Loading cards...</Text>
        </View>
      </Screen>
    );
  }

  const done = index >= cards.length;

  if (cards.length === 0 || done) {
    return (
      <Screen>
        <Container className="flex-1 items-center justify-center p-6">
          <KwagiOwl mood={reviewed > 0 ? 'excited' : 'sleepy'} size={140} animate={animate} />
          <Text className="mt-4 text-xl font-extrabold tracking-tighter text-ink">
            {reviewed > 0 ? 'Session complete' : 'No cards due'}
          </Text>
          <Text className="mt-1 text-center text-sm text-sub leading-5">
            {reviewed > 0
              ? `You reviewed ${reviewed} cards. Return to Study to check for another batch.`
              : 'Your scheduled cards are caught up. Add cards or check again later.'}
          </Text>
          <View className="mt-6 w-full gap-3">
            <Button label="Back to Study" onPress={onExit} />
            <Button label="Home" variant="secondary" onPress={() => router.navigate('/')} />
          </View>
        </Container>
      </Screen>
    );
  }

  const card = cards[index];
  const progress = index / cards.length;

  return (
    <Screen>
      <Container className="flex-1 p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Exit flashcards" className="h-11 w-11 items-center justify-center">
            <Ionicons name="close" size={26} color={c.sub} />
          </Pressable>
          <Text className="text-sm text-sub">{cards.length - index} left</Text>
          <View className="w-10" />
        </View>
        <ProgressBar progress={progress} color={c.teal} />

        <Pressable className="min-h-[180px] flex-1 items-center justify-center py-4" onPress={doFlip} disabled={rating !== null} accessibilityRole="button" accessibilityLabel={`${showBack ? 'Answer' : 'Question'}: ${showBack ? card.back : card.front}`} accessibilityHint="Double tap to flip the card">
          <View className="min-h-[180px] w-full flex-1">
            <Animated.View
              accessibilityElementsHidden={showBack}
              importantForAccessibility={showBack ? 'no-hide-descendants' : 'auto'}
              aria-hidden={showBack}
              style={[
                frontStyle,
                {
                  position: 'absolute',
                  inset: 0,
                  shadowColor: c.amber,
                  shadowOpacity: 0.25,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                },
              ]}
              className="rounded-modal border border-bordersoft bg-card"
            >
              <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text className="text-xs font-bold tracking-tight text-amber">QUESTION</Text>
                <Text className="mt-3 text-center text-lg font-semibold tracking-tight text-ink">{card.front}</Text>
                <View className="mt-6 flex-row items-center"><Ionicons name="sync" size={13} color={c.muted} /><Text className="ml-1 text-xs text-muted">Tap to flip</Text></View>
              </ScrollView>
            </Animated.View>
            <Animated.View
              accessibilityElementsHidden={!showBack}
              importantForAccessibility={!showBack ? 'no-hide-descendants' : 'auto'}
              aria-hidden={!showBack}
              style={[
                backStyle,
                {
                  position: 'absolute',
                  inset: 0,
                  shadowColor: c.teal,
                  shadowOpacity: 0.3,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                },
              ]}
              className="rounded-modal border border-teal bg-surface"
            >
              <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <Text className="text-xs font-bold tracking-tight text-teal">ANSWER</Text>
                <Text className="mt-3 text-center text-md text-ink leading-6">{card.back}</Text>
              </ScrollView>
            </Animated.View>
          </View>
        </Pressable>

        {showBack ? (
          <View className="flex-row gap-2 pt-3">
            {RATINGS.map((r) => {
              const tint = c[r.tint] as string;
              return (
                <PressableScale
                  key={r.action}
                  onPress={() => void rate(r.action)}
                  disabled={rating !== null}
                  haptic={false}
                  pressedScale={0.93}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  className="flex-1 items-center rounded-card border py-3"
                  style={{ borderColor: `${tint}55`, backgroundColor: `${tint}14` }}
                >
                  <Text className="text-sm font-bold" style={{ color: tint }}>
                    {rating === r.action ? 'Saving...' : r.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        ) : (
          <View className="pt-3">
            <Button label="Show Answer" onPress={doFlip} variant="secondary" />
          </View>
        )}
      </Container>
    </Screen>
  );
}

export default Flashcards;
