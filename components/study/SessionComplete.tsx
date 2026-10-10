import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import { Screen } from '@/components/ui/Screen';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { CountUp } from '@/components/ui/CountUp';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BubbleBurst } from '@/components/study/BubbleBurst';
import type { KwagiMood } from '@/constants/dialogues';
import { getToday } from '@/lib/db/progress';
import { useAppStore } from '@/lib/store';
import { playSound } from '@/lib/sounds';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export interface SessionStat {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  format?: (value: number) => string;
  tint: string;
}

export interface SessionAction {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props {
  title: string;
  message: string;
  mood: KwagiMood;
  stats: SessionStat[];
  primary: SessionAction;
  secondary?: SessionAction[];
  celebrate?: boolean;
}

/**
 * End of a session: Kwagi reacts, stats count up in bubbles, and the daily goal shows how close
 * the student is, followed by one clear next step so studying can continue without friction.
 */
export function SessionComplete({ title, message, mood, stats, primary, secondary = [], celebrate = true }: Props) {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const goal = useAppStore((state) => state.settings.dailyGoal);
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    playSound('complete');
    let current = true;
    getToday()
      .then((stat) => { if (current) setToday(stat.cards_studied + stat.questions_answered); })
      .catch(() => undefined);
    return () => { current = false; };
  }, []);

  const enter = (delay: number) => (animate ? FadeInDown.delay(delay).springify().damping(15) : undefined);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' }}>
        <Container className="items-center">
          {animate && celebrate && <BubbleBurst />}
          <Animated.View entering={animate ? ZoomIn.springify().damping(10) : undefined}>
            <KwagiOwl mood={mood} size={150} animate={animate} />
          </Animated.View>
          <Animated.View entering={enter(120)} style={{ width: '100%' }}>
            <Text accessibilityRole="header" className="mt-3 text-center font-display text-3xl text-ink">{title}</Text>
            <Text className="mt-1 text-center font-roundedsoft text-md leading-6 text-sub">{message}</Text>
          </Animated.View>

          <Animated.View entering={enter(240)} style={{ width: '100%' }}><View className="mt-6 w-full flex-row gap-3">
            {stats.map((stat) => (
              <View key={stat.label} className="flex-1 items-center rounded-bubble border-2 px-2 py-3" style={{ borderColor: `${stat.tint}55`, backgroundColor: `${stat.tint}14` }}>
                <Ionicons name={stat.icon} size={20} color={stat.tint} />
                <CountUp value={stat.value} format={stat.format} className="mt-1 font-display text-xl text-ink" />
                <Text className="text-center font-roundedsoft text-xs text-sub" numberOfLines={1}>{stat.label}</Text>
              </View>
            ))}
          </View></Animated.View>

          {today != null && (
            <Animated.View entering={enter(360)} style={{ width: '100%' }}><View className="mt-4 w-full rounded-bubble border-2 border-bordersoft bg-surface p-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-rounded text-sm text-ink">{today >= goal ? 'Daily goal reached!' : 'Daily goal'}</Text>
                <Text className="font-rounded text-sm text-amber">{Math.min(today, goal)} / {goal}</Text>
              </View>
              <ProgressBar progress={today / goal} color={today >= goal ? c.green : c.amber} />
            </View></Animated.View>
          )}

          <Animated.View entering={enter(440)} style={{ width: '100%' }}><View className="mt-6 w-full gap-3">
            <Button label={primary.label} onPress={primary.onPress} icon={primary.icon ? <Ionicons name={primary.icon} size={18} color={c.bg} /> : undefined} />
            {secondary.map((action) => (
              <Button key={action.label} label={action.label} variant="secondary" onPress={action.onPress} icon={action.icon ? <Ionicons name={action.icon} size={18} color={c.ink} /> : undefined} />
            ))}
          </View></Animated.View>
        </Container>
      </ScrollView>
    </Screen>
  );
}
