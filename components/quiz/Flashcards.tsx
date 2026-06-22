import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
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
import { getDueCards, reviewCard, type Flashcard } from '@/lib/db/flashcards';
import { recordStudy } from '@/lib/db/progress';
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

  useEffect(() => {
    let alive = true;
    getDueCards(30).then((due) => {
      if (alive) setCards(due);
    });
    return () => {
      alive = false;
    };
  }, []);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value * 180}deg` }],
    backfaceVisibility: 'hidden',
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${flip.value * 180 + 180}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const doFlip = useCallback(() => {
    const to = showBack ? 0 : 1;
    flip.value = withTiming(to, { duration: 320 });
    setShowBack(!showBack);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [showBack, flip]);

  const rate = useCallback(
    async (action: SwipeAction) => {
      if (!cards) return;
      const card = cards[index];
      await reviewCard(card, action);
      await recordStudy({ cardsStudied: 1, xp: 2 });
      useAppStore.getState().markStudied();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setReviewed((r) => r + 1);
      flip.value = 0;
      setShowBack(false);
      setIndex((i) => i + 1);
    },
    [cards, index, flip],
  );

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
            {reviewed > 0 ? 'Tapos na!' : 'Wala pang due'}
          </Text>
          <Text className="mt-1 text-center text-sm text-sub leading-5">
            {reviewed > 0
              ? `Na-review mo ${reviewed} cards. Balik ka bukas para sa next batch!`
              : 'Lahat ng cards ay na-review na. Good job — break muna!'}
          </Text>
          <View className="mt-6 w-full gap-3">
            <Button label="Back to Quiz" onPress={onExit} />
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
          <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Exit flashcards" className="h-10 w-10 items-center justify-center">
            <Ionicons name="close" size={26} color={c.sub} />
          </Pressable>
          <Text className="text-sm text-sub">{cards.length - index} left</Text>
          <View className="w-10" />
        </View>
        <ProgressBar progress={progress} color={c.teal} />

        <Pressable className="flex-1 items-center justify-center" onPress={doFlip} accessibilityRole="button" accessibilityLabel="Flip card">
          <View className="h-72 w-full">
            <Animated.View
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
              className="items-center justify-center rounded-modal border border-bordersoft bg-card p-6"
            >
              <Text className="text-xs font-bold tracking-tight text-amber">QUESTION</Text>
              <Text className="mt-3 text-center text-lg font-semibold tracking-tight text-ink">{card.front}</Text>
              <View className="mt-6 flex-row items-center">
                <Ionicons name="sync" size={13} color={c.muted} />
                <Text className="ml-1 text-xs text-muted">Tap to flip</Text>
              </View>
            </Animated.View>
            <Animated.View
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
              className="items-center justify-center rounded-modal border border-teal bg-surface p-6"
            >
              <Text className="text-xs font-bold tracking-tight text-teal">ANSWER</Text>
              <Text className="mt-3 text-center text-md text-ink leading-6">{card.back}</Text>
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
                  onPress={() => rate(r.action)}
                  haptic={false}
                  pressedScale={0.93}
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  className="flex-1 items-center rounded-card border py-3"
                  style={{ borderColor: `${tint}55`, backgroundColor: `${tint}14` }}
                >
                  <Text className="text-sm font-bold" style={{ color: tint }}>
                    {r.label}
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
