import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';

interface Props {
  /** 0..1 */
  progress: number;
  color?: string;
  trackClassName?: string;
  height?: number;
  /** Soft glow under the fill — on by default for a gentle sense of momentum. */
  glow?: boolean;
}

export function ProgressBar({
  progress,
  color,
  trackClassName = 'bg-border',
  height = 12,
  glow = true,
}: Props) {
  const c = useThemeColors();
  const fill = color ?? c.amber;
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, w]);

  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View className={`w-full overflow-hidden rounded-pill ${trackClassName}`} style={{ height }}>
      <Animated.View
        style={[
          {
            height,
            backgroundColor: fill,
            borderRadius: 999,
            ...(glow
              ? {
                  shadowColor: fill,
                  shadowOpacity: 0.7,
                  shadowRadius: 6,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 4,
                }
              : null),
          },
          style,
        ]}
      >
        {/* Top highlight gives the fill a soft, rounded sheen. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: Math.max(2, height / 2.5),
            borderTopLeftRadius: 999,
            borderTopRightRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.25)',
          }}
        />
      </Animated.View>
    </View>
  );
}

export default ProgressBar;
