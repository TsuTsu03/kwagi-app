import { useCallback } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { KwagiSpeech } from '@/components/kwagi/KwagiSpeech';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { FadeIn } from '@/components/ui/FadeIn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { IconBadge } from '@/components/ui/IconBadge';
import { useAppStore } from '@/lib/store';
import { useKwagiMood } from '@/hooks/useKwagiMood';
import { useThemeColors } from '@/hooks/useTheme';
import type { ThemeColors } from '@/constants/theme';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; tint: keyof ThemeColors; title: string; desc: string }[] = [
  { icon: 'bulb', tint: 'amber', title: 'AI Explanations', desc: 'Break down difficult concepts in simple Taglish.' },
  { icon: 'sparkles', tint: 'purple', title: 'Mnemonics', desc: 'Generate memory tricks that are easy to recall.' },
  { icon: 'create', tint: 'teal', title: 'Quiz Generation', desc: 'Auto-generate practice questions from your notes.' },
];

/**
 * AI chat is part of a later pass (needs the Anthropic SDK + API key wiring).
 * For now this is a friendly placeholder so the tab is navigable.
 */
export default function ChatScreen() {
  const { settings } = useAppStore();
  const c = useThemeColors();
  const { mood, flash } = useKwagiMood('thinking');
  const poke = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flash('excited', 1100);
  }, [flash]);
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Container>
        <FadeIn index={0}>
          <Text className="mb-1 text-2xl font-extrabold tracking-tighter text-ink">Ask Kwagi</Text>
          <Text className="mb-6 text-sm text-sub">AI Study Buddy</Text>
        </FadeIn>

        <FadeIn index={1}>
          <View className="items-center">
            <PressableScale onPress={poke} haptic={false} pressedScale={0.9} accessibilityRole="button" accessibilityLabel="Poke Kwagi">
              <KwagiOwl mood={mood} size={148} animate={settings.kwagiAnimations} />
            </PressableScale>
            <View className="mt-3 w-full max-w-[320px]">
              <KwagiSpeech
                text="Soon, makakausap mo na ako para sa AI explanations, mnemonics, at quiz generation."
                tail="none"
              />
            </View>
          </View>
        </FadeIn>

        <FadeIn index={2}>
          <View className="mt-6 gap-3">
            {FEATURES.map((f) => {
              const tint = c[f.tint] as string;
              return (
                <View key={f.title} className="flex-row items-center rounded-card border border-bordersoft bg-surface p-4">
                  <IconBadge name={f.icon} color={tint} box={44} />
                  <View className="ml-3 flex-1">
                    <Text className="text-md font-bold tracking-tight text-ink">{f.title}</Text>
                    <Text className="mt-0.5 text-sm text-sub leading-5">{f.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </FadeIn>

        <FadeIn index={3}>
          <Card className="mt-4">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed" size={16} color={c.purple} />
              <Text className="ml-1.5 text-md font-bold tracking-tight text-ink">100% local data</Text>
            </View>
            <Text className="mt-2 text-sm text-sub leading-5">
              Kwagi's AI chat needs an Anthropic API key. Add it in Settings — everything else stays
              fully offline.
            </Text>
            <View className="mt-3">
              <Button label="Open Settings" variant="secondary" onPress={() => router.push('/settings')} />
            </View>
          </Card>
        </FadeIn>
        </Container>
      </ScrollView>
    </Screen>
  );
}
