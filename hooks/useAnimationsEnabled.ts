import { useReducedMotion } from 'react-native-reanimated';
import { useAppStore } from '@/lib/store';

/** Resolve app animation preference while honoring OS Reduce Motion by default. */
export function useAnimationsEnabled(): boolean {
  const preference = useAppStore((state) => state.settings.animationPreference);
  const reduceMotion = useReducedMotion();

  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return !reduceMotion;
}
