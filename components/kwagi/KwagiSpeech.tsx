import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';

interface Props {
  text: string;
  /** Tail direction — points toward Kwagi. */
  tail?: 'left' | 'bottom' | 'none';
}

/** A Taglish speech bubble that scales + fades in beside Kwagi. */
export function KwagiSpeech({ text, tail = 'left' }: Props) {
  const c = useThemeColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.4)) });
  }, [text, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));

  return (
    <Animated.View style={style} className="flex-1">
      <View
        className="relative rounded-bubble bg-card border border-bordersoft px-4 py-3"
        style={{
          shadowColor: c.shadow,
          shadowOpacity: 1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        }}
      >
        <Text className="text-ink text-base leading-6">{text}</Text>
        {tail === 'left' && (
          <View
            className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 bg-card border-l border-b border-bordersoft"
          />
        )}
        {tail === 'bottom' && (
          <View className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-card border-r border-b border-bordersoft" />
        )}
      </View>
    </Animated.View>
  );
}

export default KwagiSpeech;
