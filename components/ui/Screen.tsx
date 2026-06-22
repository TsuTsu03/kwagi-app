import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { Ambiance } from '@/components/ui/Ambiance';
import { RAIL_WIDTH } from '@/components/ui/TabBar';
import { useAppStore } from '@/lib/store';
import { useTablet } from '@/hooks/useTablet';

interface Props {
  children: React.ReactNode;
  edges?: readonly Edge[];
  /** Hide the ambient backdrop (e.g. for full-bleed modals). */
  ambient?: boolean;
  /** Reserve space for the tablet nav rail. Off for pushed routes (settings). */
  rail?: boolean;
}

/**
 * Standard screen frame: the ambient night backdrop layered behind a
 * transparent SafeAreaView. Every screen uses this so the flowstate
 * ambiance is consistent app-wide. On tablets, content is inset by the left
 * nav rail width. The omnipresent peeking Kwagi is mounted once at the app
 * root (see app/_layout.tsx), not here.
 */
export function Screen({ children, edges = ['top'], ambient = true, rail = true }: Props) {
  const animate = useAppStore((s) => s.settings.kwagiAnimations);
  const { isTablet } = useTablet();
  return (
    <View className="flex-1 bg-bg">
      {ambient && <Ambiance animate={animate} />}
      <SafeAreaView
        className="flex-1"
        edges={edges}
        style={isTablet && rail ? { paddingLeft: RAIL_WIDTH } : undefined}
      >
        {children}
      </SafeAreaView>
    </View>
  );
}

export default Screen;
