import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

interface Props {
  /** 0..1 */
  progress: number;
  /** Shown at the right, e.g. "3 / 10" or "8 left". */
  label: string;
  /** Correct answers in a row; a flame bubble appears from 2. */
  combo?: number;
  onClose: () => void;
  closeLabel: string;
  disabled?: boolean;
  color?: string;
}

/** Session top bar: a round close bubble, a springy progress pill, and a combo flame. */
export function StudyHeader({ progress, label, combo = 0, onClose, closeLabel, disabled, color }: Props) {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const fill = useSharedValue(progress);
  const pop = useSharedValue(1);

  useEffect(() => {
    const target = Math.max(0, Math.min(1, progress));
    // A soft overshoot makes each answered card feel like a step forward.
    fill.value = animate ? withSpring(target, { damping: 14, stiffness: 120 }) : target;
  }, [animate, fill, progress]);
  useEffect(() => {
    if (combo >= 2 && animate) pop.value = withSequence(withTiming(1.35, { duration: 120 }), withSpring(1, { damping: 6, stiffness: 180 }));
  }, [animate, combo, pop]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, fill.value)) * 100}%` }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const tint = color ?? c.amber;

  return (
    <View className="mb-2 flex-row items-center gap-3">
      <Pressable onPress={onClose} disabled={disabled} accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} className="h-11 w-11 items-center justify-center rounded-full border border-bordersoft bg-surface">
        <Ionicons name="close" size={22} color={c.sub} />
      </Pressable>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} className="h-5 flex-1 overflow-hidden rounded-pill bg-border">
        <Animated.View style={[{ height: '100%', borderRadius: 999, backgroundColor: tint }, fillStyle]}>
          <View style={{ position: 'absolute', top: 3, left: 8, right: 8, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.35)' }} />
        </Animated.View>
      </View>
      {combo >= 2 ? (
        <Animated.View style={popStyle} accessibilityLabel={`${combo} correct in a row`}>
          <View className="flex-row items-center rounded-pill bg-amberdim px-2.5 py-1">
            <Ionicons name="flame" size={16} color={c.amber} />
            <Text className="ml-1 font-rounded text-sm text-amber">{combo}</Text>
          </View>
        </Animated.View>
      ) : (
        <Text className="min-w-[44px] text-right font-roundedsoft text-sm text-sub">{label}</Text>
      )}
    </View>
  );
}
