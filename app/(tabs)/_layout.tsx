import type { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/ui/TabBar';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export default function TabsLayout() {
  const animate = useAnimationsEnabled();
  return (
    <Tabs
      // A short horizontal shift between tabs feels smoother than an instant swap.
      screenOptions={{ headerShown: false, animation: animate ? 'shift' : 'none' }}
      // React Navigation's BottomTabBarProps structurally satisfies TabBar's
      // narrower prop type; cast to bridge the generic `emit` signature.
      tabBar={(props) => <TabBar {...(props as ComponentProps<typeof TabBar>)} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="notes" options={{ title: 'Notes' }} />
      <Tabs.Screen name="quiz" options={{ title: 'Study' }} />
      <Tabs.Screen name="cards" options={{ title: 'Cards' }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
