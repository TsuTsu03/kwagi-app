import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

/** While mounted (and `active`), hide navigation and the peeking owl for a distraction-free session. */
export function useFocusMode(active = true) {
  const setFocusMode = useAppStore((state) => state.setFocusMode);
  useEffect(() => {
    if (!active) return;
    setFocusMode(true);
    return () => setFocusMode(false);
  }, [active, setFocusMode]);
}
