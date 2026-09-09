import React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

interface Props {
  children: React.ReactNode;
  /** Stagger index — each step adds ~70ms of delay for a calm cascade. */
  index?: number;
  /** Extra base delay in ms. */
  delay?: number;
  className?: string;
}

/**
 * Soft "settle into place" entrance. Content drifts up and fades in —
 * slow and gentle, never bouncy, to keep the calm study mood. Honors the
 * user's animation setting (renders statically when disabled).
 */
export function FadeIn({ children, index = 0, delay = 0, className }: Props) {
  const animate = useAnimationsEnabled();
  if (!animate) {
    return <Animated.View className={className}>{children}</Animated.View>;
  }
  return (
    <Animated.View
      className={className}
      entering={FadeInDown.springify().damping(18).mass(0.9).delay(delay + index * 70)}
    >
      {children}
    </Animated.View>
  );
}

export default FadeIn;
