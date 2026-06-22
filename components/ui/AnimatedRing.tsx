import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppStore } from '@/lib/store';
import { useThemeColors } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0..1 fill. */
  progress: number;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke thickness. */
  stroke?: number;
  /** Fill color (defaults to amber). A lighter shade is blended for a sheen. */
  color?: string;
  /** Optional second gradient stop; defaults to a lighter tint of `color`. */
  colorTo?: string;
  children?: React.ReactNode;
}

/**
 * A circular progress dial. The arc sweeps in from empty when `progress`
 * changes — turning a flat percentage into something that visibly fills.
 * Center is a slot for a number/label.
 */
export function AnimatedRing({
  progress,
  size = 132,
  stroke = 11,
  color,
  colorTo,
  children,
}: Props) {
  const c = useThemeColors();
  const animate = useAppStore((s) => s.settings.kwagiAnimations);
  const fill = color ?? c.amber;
  const fillTo = colorTo ?? c.amberLight;

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  const p = useSharedValue(animate ? 0 : clamped);
  useEffect(() => {
    p.value = animate
      ? withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) })
      : clamped;
  }, [clamped, animate, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - p.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={fill} />
            <Stop offset="1" stopColor={fillTo} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}

export default AnimatedRing;
