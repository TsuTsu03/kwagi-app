import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { StudyTimer } from '@/lib/studyTimer';

export function useStudyTimer() {
  const timer = useRef(new StudyTimer()).current;
  useFocusEffect(useCallback(() => {
    if (AppState.currentState === 'active') timer.resume(Date.now());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') timer.resume(Date.now());
      else timer.pause(Date.now());
    });
    return () => { subscription.remove(); timer.pause(Date.now()); };
  }, [timer]));
  return timer;
}
