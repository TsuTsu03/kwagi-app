import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';

interface Particle {
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  ring: boolean;
}

function Bubble({ particle, progress }: { particle: Particle; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value * 1400 - particle.delay) / 1100));
    // Bubbles burst outward, float up a little, and fade as they "pop".
    const x = Math.cos(particle.angle) * particle.distance * t;
    const y = Math.sin(particle.angle) * particle.distance * t - 40 * t;
    return {
      opacity: t === 0 ? 0 : 1 - t * t,
      transform: [{ translateX: x }, { translateY: y }, { scale: 0.4 + t * 0.8 }],
    };
  });
  return (
    <Animated.View
      style={[style, {
        position: 'absolute',
        width: particle.size,
        height: particle.size,
        borderRadius: particle.size / 2,
        backgroundColor: particle.ring ? 'transparent' : particle.color,
        borderWidth: particle.ring ? 3 : 0,
        borderColor: particle.color,
        marginLeft: -particle.size / 2,
        marginTop: -particle.size / 2,
      }]}
    />
  );
}

/** Repeatable pseudo-random value in [0, 1) so the burst looks scattered but renders purely. */
const jitter = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** A one-time burst of soft bubbles behind a celebration. Render it only when animations are on. */
export function BubbleBurst({ count = 26 }: { count?: number }) {
  const c = useThemeColors();
  const progress = useSharedValue(0);
  const particles = useMemo<Particle[]>(() => {
    const palette = [c.amber, c.teal, c.purple, c.green, c.indigo, c.coral];
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2 + jitter(i + 1) * 0.4,
      distance: 90 + jitter(i + 101) * 110,
      size: 8 + jitter(i + 201) * 16,
      color: palette[i % palette.length],
      delay: jitter(i + 301) * 250,
      ring: i % 3 === 0,
    }));
  }, [c, count]);

  useEffect(() => {
    progress.value = withDelay(80, withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }));
  }, [progress]);

  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ position: 'absolute', left: '50%', top: 110, width: 0, height: 0 }}>
      {particles.map((particle, index) => <Bubble key={index} particle={particle} progress={progress} />)}
    </View>
  );
}
