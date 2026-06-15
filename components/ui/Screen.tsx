import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { Ambiance } from '@/components/ui/Ambiance';
import { useAppStore } from '@/lib/store';

interface Props {
  children: React.ReactNode;
  edges?: readonly Edge[];
  /** Hide the ambient backdrop (e.g. for full-bleed modals). */
  ambient?: boolean;
}

/**
 * Standard screen frame: the ambient night backdrop layered behind a
 * transparent SafeAreaView. Every screen uses this so the flowstate
 * ambiance is perfectly consistent app-wide.
 */
export function Screen({ children, edges = ['top'], ambient = true }: Props) {
  const animate = useAppStore((s) => s.settings.kwagiAnimations);
  return (
    <View className="flex-1 bg-bg">
      {ambient && <Ambiance animate={animate} />}
      <SafeAreaView className="flex-1" edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export default Screen;
