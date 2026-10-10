import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

interface Props {
  correct: boolean;
  title: string;
  /** Shown under the title, e.g. the right answer after a miss. */
  detailLabel?: string;
  detail?: string;
  actionLabel: string;
  onContinue: () => void;
  busy?: boolean;
}

/** The answer result slides up from the bottom in a soft bubble, with one big Continue button. */
export function FeedbackSheet({ correct, title, detailLabel, detail, actionLabel, onContinue, busy }: Props) {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const insets = useSafeAreaInsets();
  const enter = useSharedValue(animate ? 0 : 1);
  const tint = correct ? c.green : c.coral;

  useEffect(() => {
    if (animate) enter.value = withSpring(1, { damping: 16, stiffness: 170 });
  }, [animate, enter]);
  const style = useAnimatedStyle(() => ({ opacity: Math.min(1, enter.value * 2), transform: [{ translateY: (1 - enter.value) * 140 }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.5 + Math.min(1.1, enter.value) * 0.5 }] }));

  return (
    <Animated.View
      accessibilityLiveRegion="assertive"
      style={[style, { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 2, borderBottomWidth: 0, borderColor: `${tint}55`, backgroundColor: c.surface, overflow: 'hidden' }]}
    >
      <View style={{ backgroundColor: `${tint}1F`, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 + insets.bottom }}>
        <View className="mb-3 flex-row items-center">
          <Animated.View style={[iconStyle, { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: tint }]}>
            <Ionicons name={correct ? 'checkmark' : 'close'} size={24} color={c.bg} />
          </Animated.View>
          <Text className="ml-3 flex-1 font-display text-xl" style={{ color: tint }}>{title}</Text>
        </View>
        {!!detail && (
          <View className="mb-3">
            {!!detailLabel && <Text className="font-rounded text-sm" style={{ color: tint }}>{detailLabel}</Text>}
            <Text className="mt-0.5 font-roundedsoft text-md leading-6 text-ink">{detail}</Text>
          </View>
        )}
        <Button label={actionLabel} color={tint} disabled={busy} onPress={onContinue} />
      </View>
    </Animated.View>
  );
}
