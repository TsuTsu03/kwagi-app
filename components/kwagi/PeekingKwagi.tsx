import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { PressableScale } from '@/components/ui/PressableScale';
import { useKwagiMood } from '@/hooks/useKwagiMood';
import { useAppStore } from '@/lib/store';
import { useThemeColors } from '@/hooks/useTheme';
import { randomPeek, randomPoke } from '@/constants/dialogues';
import { getPeekContext, peekAdvice, type PeekAdvice } from '@/lib/peek';

type SlotId = 'right' | 'left' | 'bottomRight' | 'bottomLeft';

interface SlotConfig {
  axis: 'x' | 'y';
  /** Anchor for the wrapper (absolute placement). */
  anchor: { left?: number; right?: number; top?: number; bottom?: number };
  /** Which side the speech bubble sits on. */
  bubble: 'left' | 'right';
}

const SIZE = 78;
/** How much of the owl stays hidden past the edge when peeking (0..1). */
const HIDE = 0.44;
/** Sit clear of the bottom tab bar. */
const BOTTOM_OFFSET = 96;

/**
 * Builds the four peek slots. Side slots ride at ~55% height; bottom slots
 * tuck into the corners above the tab bar. Vertical anchors are computed from
 * the live window height so it lands consistently across devices.
 */
function buildSlots(height: number): Record<SlotId, SlotConfig> {
  const midY = Math.round(height * 0.52);
  return {
    right: { axis: 'x', anchor: { right: 0, top: midY }, bubble: 'left' },
    left: { axis: 'x', anchor: { left: 0, top: midY }, bubble: 'right' },
    bottomRight: { axis: 'y', anchor: { right: 10, bottom: BOTTOM_OFFSET }, bubble: 'left' },
    bottomLeft: { axis: 'y', anchor: { left: 10, bottom: BOTTOM_OFFSET }, bubble: 'right' },
  };
}

const SLOT_IDS: SlotId[] = ['right', 'left', 'bottomRight', 'bottomLeft'];

/**
 * Kwagi's omnipresence layer. A small Kwagi peeks in from a random screen
 * edge every so often, sometimes with a quick Taglish hello, then ducks back
 * out. Tap it and Kwagi perks up. Rendered inside every Screen, so the study
 * buddy is always around without each screen wiring it up.
 *
 * Honors the user's animation setting: when off, Kwagi simply rests in the
 * bottom-right corner (still present, just not roaming).
 */
export function PeekingKwagi() {
  const { height } = useWindowDimensions();
  const animate = useAppStore((s) => s.settings.kwagiAnimations);
  const c = useThemeColors();
  const { mood, setBase, flash } = useKwagiMood('happy');

  const [slot, setSlot] = useState<SlotId>('bottomRight');
  const [line, setLine] = useState<string | null>(null);
  const [route, setRoute] = useState<PeekAdvice['route']>(undefined);
  const t = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const slots = buildSlots(height);
  const cfg = slots[slot];
  const hidden = SIZE; // fully past the edge
  const shown = SIZE * HIDE; // peeking

  // The bubble lives in its own on-screen layer (it must NOT ride the owl's
  // off-edge translate, or the text gets clipped past the screen edge). It sits
  // just inward of the owl's visible width and only fades with him.
  const midY = Math.round(height * 0.52);
  const INSET = Math.round(SIZE * (1 - HIDE)) + 12;
  const bubbleAnchor =
    slot === 'right'
      ? { right: INSET, top: midY - 10 }
      : slot === 'left'
        ? { left: INSET, top: midY - 10 }
        : slot === 'bottomRight'
          ? { right: INSET, bottom: BOTTOM_OFFSET + Math.round(SIZE * 0.5) }
          : { left: INSET, bottom: BOTTOM_OFFSET + Math.round(SIZE * 0.5) };

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let alive = true;

    if (!animate) {
      // Resting peek — always visible in the corner, no cycle, but still
      // shows a contextual hello so he's never blank.
      setSlot('bottomRight');
      t.value = 1;
      void (async () => {
        try {
          const advice = peekAdvice(await getPeekContext());
          if (!alive) return;
          setBase(advice.mood);
          setLine(advice.text);
          setRoute(advice.route);
        } catch {
          /* stay quiet */
        }
      })();
      return () => {
        alive = false;
      };
    }

    const push = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    const retreat = () => {
      if (!alive) return;
      setLine(null);
      setRoute(undefined);
      t.value = withTiming(0, { duration: 480, easing: Easing.in(Easing.cubic) });
      push(appear, 9000 + Math.random() * 15000);
    };

    const appear = () => {
      if (!alive) return;
      void (async () => {
        let advice: PeekAdvice;
        try {
          advice = peekAdvice(await getPeekContext());
        } catch {
          advice = randomPeek();
        }
        if (!alive) return;
        setSlot(SLOT_IDS[Math.floor(Math.random() * SLOT_IDS.length)]);
        setBase(advice.mood); // face matches the message
        setLine(advice.text);
        setRoute(advice.route);
        // Springy pop-in (Remotion "snappy" preset) so he bounces past the edge.
        t.value = withSpring(1, { damping: 13, stiffness: 150, mass: 0.9 });
        push(retreat, 3400 + Math.random() * 2400);
      })();
    };

    push(appear, 3500 + Math.random() * 5000);

    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [animate, height]);

  const style = useAnimatedStyle(() => {
    const v = hidden + (shown - hidden) * t.value;
    const sign = slot === 'right' || slot === 'bottomRight' ? 1 : -1;
    const scale = 0.9 + 0.1 * t.value;
    const rot = `${wiggle.value}deg`;
    return {
      opacity: 0.4 + 0.6 * t.value,
      transform:
        cfg.axis === 'x'
          ? [{ translateX: v * sign }, { scale }, { rotate: rot }]
          : [{ translateY: v }, { scale }, { rotate: rot }],
    };
  });

  const bubbleStyle = useAnimatedStyle(() => ({ opacity: t.value }));

  const poke = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    wiggle.value = withSequence(
      withTiming(-8, { duration: 70 }),
      withTiming(8, { duration: 90 }),
      withTiming(0, { duration: 110 }),
    );
    if (route) {
      // Follow Kwagi's call to action.
      flash('excited', 900);
      router.navigate(route);
      return;
    }
    // No errand — just a playful reaction.
    const quip = randomPoke();
    flash(quip.mood, 1300);
    setLine(quip.text);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Speech bubble — own on-screen layer, just fades; never slides off-edge */}
      {line ? (
        <Animated.View
          style={[{ position: 'absolute', maxWidth: 210 }, bubbleAnchor, bubbleStyle]}
          pointerEvents="none"
        >
          <View
            className="rounded-bubble border border-bordersoft bg-card px-3 py-2"
            style={{
              shadowColor: c.shadow,
              shadowOpacity: 1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 4,
            }}
          >
            <Text className="text-sm leading-5 text-ink">{line}</Text>
            {route ? (
              <View className="mt-1 flex-row items-center">
                <Text className="text-xs font-bold tracking-tight text-amber">Tap me</Text>
                <Ionicons name="arrow-forward" size={11} color={c.amber} style={{ marginLeft: 2 }} />
              </View>
            ) : null}
          </View>
        </Animated.View>
      ) : null}

      {/* Owl — keeps the off-edge peek transform */}
      <Animated.View style={[{ position: 'absolute', width: SIZE }, cfg.anchor, style]}>
        <PressableScale onPress={poke} haptic={false} pressedScale={0.85} accessibilityRole="button" accessibilityLabel="Kwagi">
          <KwagiOwl
            mood={mood}
            size={SIZE}
            animate={animate}
            peek={slot === 'left' || slot === 'bottomLeft' ? 'left' : 'right'}
          />
        </PressableScale>
      </Animated.View>
    </View>
  );
}

export default PeekingKwagi;
