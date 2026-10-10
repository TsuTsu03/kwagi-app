import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { StudyHeader } from '@/components/study/StudyHeader';
import { SessionComplete } from '@/components/study/SessionComplete';
import type { KwagiMood } from '@/constants/dialogues';
import { countDue, getDueCards, reviewCardAndRecord, type Flashcard } from '@/lib/db/flashcards';
import type { SwipeAction } from '@/lib/srs';
import { showAlert } from '@/lib/alert';
import { useAppStore } from '@/lib/store';
import { playSound } from '@/lib/sounds';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { useStudyTimer } from '@/hooks/useStudyTimer';
import { useFocusMode } from '@/hooks/useFocusMode';
import type { ThemeColors } from '@/constants/theme';

const BATCH = 20;
const LIP = 5;

const RATINGS: { action: SwipeAction; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; tint: keyof ThemeColors }[] = [
  { action: 'again', label: 'Again', hint: 'Forgot', icon: 'refresh', tint: 'coral' },
  { action: 'hard', label: 'Hard', hint: 'Struggled', icon: 'help', tint: 'amber' },
  { action: 'good', label: 'Good', hint: 'Got it', icon: 'checkmark', tint: 'teal' },
  { action: 'easy', label: 'Easy', hint: 'Instant', icon: 'flash', tint: 'green' },
];

const REACTION: Record<SwipeAction, KwagiMood> = { again: 'wrong', hard: 'thinking', good: 'correct', easy: 'excited' };

function RatingBubble({ label, hint, icon, tint, disabled, onPress }: { label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; tint: string; disabled: boolean; onPress: () => void }) {
  const press = useSharedValue(0);
  const animate = useAnimationsEnabled();
  const c = useThemeColors();
  const face = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * LIP }] }));
  return (
    <Pressable
      style={{ flex: 1 }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => { press.value = withTiming(animate ? 1 : 0, { duration: 60 }); }}
      onPressOut={() => { press.value = withTiming(0, { duration: 120 }); }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hint}`}
    >
      <View style={{ borderRadius: 20, backgroundColor: `${tint}88`, paddingBottom: LIP }}>
        <Animated.View style={[face, { borderRadius: 20, borderWidth: 2, borderColor: tint, backgroundColor: c.surface, overflow: 'hidden' }]}>
          <View style={{ alignItems: 'center', paddingVertical: 10, backgroundColor: `${tint}1F` }}>
            <Ionicons name={icon} size={18} color={tint} />
            <Text className="mt-0.5 font-rounded text-sm" style={{ color: tint }}>{label}</Text>
            <Text className="font-roundedsoft text-xs text-sub">{hint}</Text>
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export function ReviewSession({ onExit }: { onExit: () => void }) {
  useFocusMode();
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<KwagiMood>('thinking');
  const [tally, setTally] = useState({ reviewed: 0, remembered: 0, seconds: 0 });
  const [moreDue, setMoreDue] = useState(0);
  const timer = useStudyTimer();
  const cardStartedAt = useRef(0);
  const lock = useRef(false);

  // 0 = question, 1 = answer. The card squashes flat at 0.5 and swaps faces, which reads as a
  // flip on every platform (3D backface hiding is unreliable on the web).
  const flip = useSharedValue(0);
  const fly = useSharedValue(0);
  const enter = useSharedValue(1);

  const load = useCallback(() => {
    let alive = true;
    setCards(null);
    setLoadError(false);
    getDueCards(BATCH)
      .then((due) => {
        if (!alive) return;
        setCards(due);
        setIndex(0);
        cardStartedAt.current = timer.elapsed(Date.now());
      })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [timer]);

  useEffect(() => {
    let cancel: (() => void) | undefined;
    const timeout = setTimeout(() => { cancel = load(); }, 0);
    return () => { clearTimeout(timeout); cancel?.(); };
  }, [load]);

  const done = !!cards && index >= cards.length;
  useEffect(() => {
    if (!done || !tally.reviewed) return;
    let alive = true;
    countDue().then((count) => { if (alive) setMoreDue(count); }).catch(() => undefined);
    return () => { alive = false; };
  }, [done, tally.reviewed]);

  const doFlip = useCallback(() => {
    if (lock.current) return;
    const to = showBack ? 0 : 1;
    // eslint-disable-next-line react-hooks/immutability
    flip.value = animate ? withTiming(to, { duration: 360, easing: Easing.inOut(Easing.cubic) }) : to;
    setShowBack(!showBack);
    setMood(to ? 'happy' : 'thinking');
    playSound('pop');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [animate, flip, showBack]);

  const rate = useCallback(async (action: SwipeAction) => {
    if (!cards || lock.current) return;
    lock.current = true;
    setBusy(true);
    const card = cards[index];
    try {
      const elapsed = timer.elapsed(Date.now());
      const seconds = Math.max(1, Math.round((elapsed - cardStartedAt.current) / 1000));
      await reviewCardAndRecord(card, action, seconds);
      cardStartedAt.current = timer.elapsed(Date.now());
      void useAppStore.getState().markStudied().catch(() => undefined);
      setMood(REACTION[action]);
      playSound(action === 'again' ? 'wrong' : action === 'hard' ? 'pop' : 'correct');
      void Haptics.impactAsync(action === 'again' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
      setTally((value) => ({ reviewed: value.reviewed + 1, remembered: value.remembered + (action === 'good' || action === 'easy' ? 1 : 0), seconds: value.seconds + seconds }));
      // Missed cards slide left; remembered cards slide right.
      const direction = action === 'again' ? -1 : 1;
      /* eslint-disable react-hooks/immutability -- Reanimated shared values are mutable animation state. */
      if (animate) {
        fly.value = withTiming(direction, { duration: 230, easing: Easing.in(Easing.cubic) });
        await new Promise((resolve) => setTimeout(resolve, 240));
      }
      fly.value = 0;
      flip.value = 0;
      setShowBack(false);
      setIndex((value) => value + 1);
      setMood('thinking');
      if (animate) {
        enter.value = 0;
        enter.value = withSpring(1, { damping: 13, stiffness: 160 });
      }
      /* eslint-enable react-hooks/immutability */
    } catch {
      showAlert('Could not save review', 'If this card was edited or paused, start a new review. Your progress was not changed.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [animate, cards, enter, flip, fly, index, timer]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.abs(fly.value) * 0.6,
    transform: [
      { translateX: fly.value * 420 },
      { rotate: `${fly.value * 14}deg` },
      { scale: 0.92 + enter.value * 0.08 },
      { scaleX: Math.max(0.02, Math.abs(1 - flip.value * 2)) },
      { scaleY: 1 + (1 - Math.abs(1 - flip.value * 2)) * 0.04 },
    ],
  }));
  const frontStyle = useAnimatedStyle(() => ({ opacity: flip.value < 0.5 ? 1 : 0 }));
  const backStyle = useAnimatedStyle(() => ({ opacity: flip.value >= 0.5 ? 1 : 0 }));

  const exitSession = () => {
    if (!tally.reviewed) { onExit(); return; }
    showAlert('End this review?', `${tally.reviewed} reviewed cards are already saved.`, [
      { text: 'Keep studying', style: 'cancel' }, { text: 'End review', onPress: onExit },
    ]);
  };

  if (loadError) {
    return (
      <Screen>
        <Container className="flex-1 items-center justify-center p-6">
          <KwagiOwl mood="thinking" size={120} animate={animate} />
          <Text className="mt-4 text-center font-rounded text-lg text-ink">Cards could not load.</Text>
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
          <Text className="mt-4 font-roundedsoft text-sub">Getting your cards ready...</Text>
        </View>
      </Screen>
    );
  }

  if (done || !cards.length) {
    if (!tally.reviewed) {
      return (
        <Screen>
          <Container className="flex-1 items-center justify-center p-6">
            <KwagiOwl mood="sleepy" size={140} animate={animate} />
            <Text className="mt-4 text-center font-display text-2xl text-ink">All caught up!</Text>
            <Text className="mt-1 text-center font-roundedsoft text-md leading-6 text-sub">No cards are due right now. A quick quiz keeps them fresh.</Text>
            <View className="mt-6 w-full gap-3">
              <Button label="Back to Study" onPress={onExit} />
              <Button label="Home" variant="secondary" onPress={() => { onExit(); router.navigate('/'); }} />
            </View>
          </Container>
        </Screen>
      );
    }
    const minutes = Math.max(1, Math.round(tally.seconds / 60));
    return (
      <SessionComplete
        mood={tally.remembered / tally.reviewed >= 0.7 ? 'excited' : 'happy'}
        title="Review done!"
        message={moreDue ? `${moreDue} more ${moreDue === 1 ? 'card is' : 'cards are'} due. Keep the rhythm going?` : 'Everything due is reviewed. Kwagi will bring cards back right before you forget them.'}
        stats={[
          { icon: 'albums', label: 'Reviewed', value: tally.reviewed, tint: c.teal },
          { icon: 'heart', label: 'Remembered', value: tally.remembered, tint: c.green },
          { icon: 'time', label: 'Minutes', value: minutes, tint: c.purple },
        ]}
        primary={moreDue ? { label: 'Keep going', icon: 'play', onPress: () => { setTally({ reviewed: 0, remembered: 0, seconds: 0 }); setMoreDue(0); load(); } } : { label: 'Done', onPress: onExit }}
        secondary={moreDue ? [{ label: 'Done', onPress: onExit }] : []}
      />
    );
  }

  const card = cards[index];
  const remaining = cards.length - index;
  const face = (side: 'front' | 'back') => (
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingTop: 44, paddingBottom: 22 }}>
      <View className="mb-3 rounded-pill px-3 py-1" style={{ backgroundColor: side === 'front' ? `${c.amber}22` : `${c.teal}22` }}>
        <Text className="font-rounded text-xs uppercase" style={{ color: side === 'front' ? c.amber : c.teal }}>{side === 'front' ? card.subject || 'Question' : 'Answer'}</Text>
      </View>
      <Text className={`text-center ${side === 'front' ? 'font-rounded text-xl leading-8' : 'font-roundedsoft text-lg leading-7'} text-ink`}>{side === 'front' ? card.front : card.back}</Text>
      {side === 'front' && (
        <View className="mt-6 flex-row items-center"><Ionicons name="hand-left-outline" size={14} color={c.muted} /><Text className="ml-1 font-roundedsoft text-xs text-muted">Tap the card to flip</Text></View>
      )}
    </ScrollView>
  );

  return (
    <Screen>
      <Container className="flex-1 px-4 pt-2">
        <StudyHeader progress={index / cards.length} label={`${remaining} left`} onClose={exitSession} closeLabel="End review" disabled={busy} color={c.teal} />
        <Pressable
          className="flex-1 justify-center pb-4 pt-2"
          onPress={doFlip}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${showBack ? 'Answer' : 'Question'}: ${showBack ? card.back : card.front}`}
          accessibilityHint={showBack ? 'Rate how well you remembered it below' : 'Double tap to show the answer'}
        >
          <View style={{ flex: 1, maxHeight: 440, minHeight: 260, marginTop: 52 }}>
          {/* Kwagi perches on the card and reacts to each rating. */}
          <View pointerEvents="none" style={{ position: 'absolute', top: -58, left: 0, right: 0, alignItems: 'center', zIndex: 2 }}>
            <KwagiOwl mood={mood} size={68} animate={animate} />
          </View>
          <Animated.View style={[cardStyle, { flex: 1 }]}>
            {/* Chunky bubble card: a colored lip under a soft rounded face. */}
            <View style={{ flex: 1, borderRadius: 32, backgroundColor: showBack ? `${c.teal}66` : c.border, paddingBottom: 7 }}>
              <View style={{ flex: 1, borderRadius: 32, borderWidth: 2, borderColor: showBack ? c.teal : c.border, backgroundColor: c.card, overflow: 'hidden' }}>
                <Animated.View style={[frontStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]} pointerEvents={showBack ? 'none' : 'auto'} accessibilityElementsHidden={showBack} importantForAccessibility={showBack ? 'no-hide-descendants' : 'auto'}>
                  {face('front')}
                </Animated.View>
                <Animated.View style={[backStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]} pointerEvents={showBack ? 'auto' : 'none'} accessibilityElementsHidden={!showBack} importantForAccessibility={!showBack ? 'no-hide-descendants' : 'auto'}>
                  {face('back')}
                </Animated.View>
              </View>
            </View>
          </Animated.View>
          </View>
        </Pressable>
        <View className="pb-4">
          {showBack ? (
            <View className="flex-row gap-2">
              {RATINGS.map((rating) => (
                <RatingBubble key={rating.action} label={rating.label} hint={rating.hint} icon={rating.icon} tint={c[rating.tint] as string} disabled={busy} onPress={() => void rate(rating.action)} />
              ))}
            </View>
          ) : (
            <Button label="Show answer" color={c.teal} onPress={doFlip} disabled={busy} icon={<Ionicons name="eye" size={18} color={c.bg} />} />
          )}
        </View>
      </Container>
    </Screen>
  );
}
