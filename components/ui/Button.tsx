import React from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  icon?: React.ReactNode;
  haptic?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const VARIANT_BG: Record<Variant, string> = {
  primary: 'bg-amber',
  secondary: 'bg-card border border-bordersoft',
  ghost: 'bg-transparent',
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary: 'text-bg',
  secondary: 'text-ink',
  ghost: 'text-amber',
};

export function Button({
  label,
  variant = 'primary',
  icon,
  haptic = true,
  fullWidth = false,
  disabled,
  className = '',
  onPress,
  ...rest
}: Props) {
  const c = useThemeColors();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Soft floating shadow so the button reads like a pressable "bubble".
  const shadow =
    disabled || variant === 'ghost'
      ? undefined
      : variant === 'primary'
        ? {
            shadowColor: c.amber,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }
        : {
            shadowColor: c.shadow,
            shadowOpacity: 1,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          };

  return (
    <Animated.View style={[style, shadow, fullWidth ? { width: '100%' } : undefined]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPressIn={() => (scale.value = withTiming(0.95, { duration: 90 }))}
        onPressOut={() => {
          // Gentle bubble pop on release.
          scale.value = withSequence(
            withTiming(1.03, { duration: 120 }),
            withTiming(1, { duration: 120 }),
          );
        }}
        onPress={(e) => {
          if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        className={`min-h-[54px] flex-row items-center justify-center rounded-pill px-6 py-3.5 ${VARIANT_BG[variant]} ${disabled ? 'opacity-40' : ''} ${className}`}
        {...rest}
      >
        {icon ? <View className="mr-2">{icon}</View> : null}
        <Text className={`text-md font-bold tracking-tight ${VARIANT_TEXT[variant]}`}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default Button;
