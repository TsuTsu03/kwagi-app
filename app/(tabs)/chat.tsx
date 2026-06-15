import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { KwagiSpeech } from '@/components/kwagi/KwagiSpeech';
import { Screen } from '@/components/ui/Screen';
import { FadeIn } from '@/components/ui/FadeIn';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/lib/store';
import { useThemeColors } from '@/hooks/useTheme';
import type { ThemeColors } from '@/constants/theme';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; tint: keyof ThemeColors; title: string; desc: string }[] = [
  { icon: 'bulb', tint: 'amber', title: 'AI Explanations', desc: 'Ipaliwanag ang mahirap na konsepto sa simpleng Taglish.' },
  { icon: 'sparkles', tint: 'purple', title: 'Mnemonics', desc: 'Gumawa ng madaling tandaan na memory tricks.' },
  { icon: 'create', tint: 'teal', title: 'Quiz Generation', desc: 'Auto-gawa ng practice questions mula sa notes mo.' },
];

/**
 * AI chat is part of a later pass (needs the Anthropic SDK + API key wiring).
 * For now this is a friendly placeholder so the tab is navigable.
 */
export default function ChatScreen() {
  const { settings } = useAppStore();
  const c = useThemeColors();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <FadeIn index={0}>
          <Text className="mb-1 text-2xl font-extrabold tracking-tighter text-ink">Ask Kwagi</Text>
          <Text className="mb-6 text-sm text-sub">AI Study Buddy</Text>
        </FadeIn>

        <FadeIn index={1}>
          <View className="items-center">
            <KwagiOwl mood="thinking" size={148} animate={settings.kwagiAnimations} />
            <View className="mt-3 w-full max-w-[320px]">
              <KwagiSpeech
                text="Soon, makakausap mo na ako para sa AI explanations, mnemonics, at quiz generation! 🦉"
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
                  <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}1F` }}>
                    <Ionicons name={f.icon} size={22} color={tint} />
                  </View>
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
              Para gumana ang Kwagi AI chat, kailangan ng Anthropic API key. I-add mo ito sa Settings —
              offline pa rin ang lahat ng iba mong data.
            </Text>
            <View className="mt-3">
              <Button label="Open Settings" variant="secondary" onPress={() => router.push('/settings')} />
            </View>
          </Card>
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}
