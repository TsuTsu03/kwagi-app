import { useCallback, useEffect, useRef, useState } from 'react';
import type { KwagiMood } from '@/constants/dialogues';

/**
 * Tracks Kwagi's mood. `flash` sets a transient mood (e.g. correct/wrong)
 * that auto-reverts to the base mood after `duration` ms.
 */
export function useKwagiMood(base: KwagiMood = 'happy') {
  const [mood, setMood] = useState<KwagiMood>(base);
  const baseRef = useRef<KwagiMood>(base);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setBase = useCallback((m: KwagiMood) => {
    baseRef.current = m;
    setMood(m);
  }, []);

  const flash = useCallback((m: KwagiMood, duration = 2500) => {
    if (timer.current) clearTimeout(timer.current);
    setMood(m);
    timer.current = setTimeout(() => setMood(baseRef.current), duration);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { mood, setMood, setBase, flash };
}
