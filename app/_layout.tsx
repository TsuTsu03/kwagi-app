import '../global.css';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, router, useSegments } from 'expo-router';
import { colorScheme } from 'nativewind';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { useAppStore } from '@/lib/store';
import { getDb } from '@/lib/db/client';
import { useThemeColors, useIsDark } from '@/hooks/useTheme';

export default function RootLayout() {
  const hydrate = useAppStore((s) => s.hydrate);
  const themePref = useAppStore((s) => s.settings.themePref);
  const c = useThemeColors();
  const isDark = useIsDark();
  const hydrated = useAppStore((s) => s.hydrated);
  const onboardingComplete = useAppStore((s) => s.settings.onboardingComplete);
  const animationPreference = useAppStore((s) => s.settings.animationPreference);
  const segments = useSegments();
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    void hydrate();
    // Warm up the DB (runs schema + first-launch seed).
    void getDb().then(() => setDbError(false)).catch(() => setDbError(true));
  }, [hydrate]);

  // Apply the user's saved theme preference (light / dark / follow system).
  useEffect(() => {
    colorScheme.set(themePref);
  }, [themePref]);

  useEffect(() => {
    if (!hydrated) return;
    const onOnboarding = segments[0] === 'onboarding';
    if (!onboardingComplete && !onOnboarding) router.replace('/onboarding');
    if (onboardingComplete && onOnboarding) router.replace('/');
  }, [hydrated, onboardingComplete, segments]);

  if (dbError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: c.bg }}><Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>Kwagi could not open your study library.</Text><Text style={{ color: c.sub, marginTop: 8, textAlign: 'center' }}>Your data was not deleted. Close and reopen the app, then try again.</Text><Pressable onPress={() => { setDbError(false); void getDb().catch(() => setDbError(true)); }} style={{ marginTop: 20, backgroundColor: c.amber, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 }}><Text style={{ color: c.bg, fontWeight: '700' }}>Try again</Text></Pressable></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <ReducedMotionConfig
        mode={animationPreference === 'on' ? ReduceMotion.Never : animationPreference === 'off' ? ReduceMotion.Always : ReduceMotion.System}
      />
      <SafeAreaProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="backup" />
          <Stack.Screen name="legal" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
