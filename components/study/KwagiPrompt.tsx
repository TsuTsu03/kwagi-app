import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { KwagiOwl } from '@/components/kwagi/KwagiOwl';
import type { KwagiMood } from '@/constants/dialogues';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

interface Props {
  /** Small label above the bubble, such as the subject. */
  eyebrow?: string;
  text: string;
  mood?: KwagiMood;
  /** Changes whenever a new prompt appears, replaying the pop-in. */
  promptKey: string | number;
}

/** Kwagi asks the question in a speech bubble, and his face reacts to the answer. */
export function KwagiPrompt({ eyebrow, text, mood = 'thinking', promptKey }: Props) {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const appear = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    appear.value = 0;
    appear.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.6)) });
  }, [animate, appear, promptKey]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.85 + appear.value * 0.15 }, { translateY: (1 - appear.value) * 10 }],
  }));

  return (
    <View className="flex-row items-end">
      <View style={{ width: 84, marginRight: 4 }}>
        <KwagiOwl mood={mood} size={84} animate={animate} />
      </View>
      <Animated.View style={[{ flex: 1, marginBottom: 18 }, bubbleStyle]}>
        <View
          className="rounded-bubble border-2 border-bordersoft bg-card px-4 py-3.5"
          style={{ shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 }}
        >
          {!!eyebrow && <Text className="mb-1 font-rounded text-xs uppercase text-teal" numberOfLines={1}>{eyebrow}</Text>}
          <Text accessibilityRole="header" className="font-rounded text-lg leading-7 text-ink">{text}</Text>
          {/* Tail pointing back at Kwagi. */}
          <View className="absolute -left-2 bottom-5 h-4 w-4 rotate-45 border-b-2 border-l-2 border-bordersoft bg-card" />
        </View>
      </Animated.View>
    </View>
  );
}
