import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

interface Props extends TextProps {
  /** Target numeric value. */
  value: number;
  /** Tween duration in ms. */
  duration?: number;
  /** Map the running integer to display text (e.g. n => `${n}%`). */
  format?: (n: number) => string;
  className?: string;
}

/** easeOutCubic — fast start, gentle settle. Matches the app's calm motion. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that counts up to `value` when it changes. Animates from the
 * previously shown number so returning to a screen rolls from the old total
 * to the new one. Honors the user's animation setting (snaps instantly when
 * off) and always lands exactly on `value`.
 */
export function CountUp({ value, duration = 800, format, className, ...rest }: Props) {
  const animate = useAnimationsEnabled();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (!animate) {
      fromRef.current = value;
      const sync = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(sync);
    }
    const from = fromRef.current;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setDisplay(Math.round(from + (value - from) * ease(t)));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate, duration]);

  const visibleValue = animate ? display : value;

  return (
    <Text className={className} {...rest}>
      {format ? format(visibleValue) : visibleValue}
    </Text>
  );
}

export default CountUp;
