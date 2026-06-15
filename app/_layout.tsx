import '../global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { colorScheme } from 'nativewind';
import { useAppStore } from '@/lib/store';
import { getDb } from '@/lib/db/client';
import { useThemeColors, useIsDark } from '@/hooks/useTheme';

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  const themePref = useAppStore((s) => s.settings.themePref);
  const c = useThemeColors();
  const isDark = useIsDark();

  useEffect(() => {
    void hydrate();
    // Warm up the DB (runs schema + first-launch seed).
    void getDb().catch((e) => console.warn('DB init failed', e));
  }, [hydrate]);

  // Apply the user's saved theme preference (light / dark / follow system).
  useEffect(() => {
    colorScheme.set(themePref);
  }, [themePref]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
