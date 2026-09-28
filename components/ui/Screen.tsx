import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { Ambiance } from '@/components/ui/Ambiance';
import { RAIL_WIDTH } from '@/components/ui/TabBar';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { useTablet } from '@/hooks/useTablet';

interface Props {
  children: React.ReactNode;
  edges?: readonly Edge[];
  /** Hide the ambient night/day sky backdrop (e.g. for full-bleed modals). */
  ambient?: boolean;
  /** Reserve space for the tablet nav rail. Off for pushed routes (settings). */
  rail?: boolean;
}

/**
 * Standard screen frame with the ambient night/day sky backdrop behind it.
 * Tablet content is inset by the navigation rail width.
 */
export function Screen({ children, edges = ['top'], ambient = true, rail = true }: Props) {
  const animate = useAnimationsEnabled();
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
