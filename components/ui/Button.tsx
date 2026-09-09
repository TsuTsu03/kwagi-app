import React from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  icon?: React.ReactNode;
  haptic?: boolean;
  fullWidth?: boolean;
  className?: string;
}

const VARIANT_TEXT: Record<Variant, string> = {
  primary: 'text-bg',
  secondary: 'text-ink',
  ghost: 'text-amber',
};

/** Mix a hex color toward black by `amt` (0..1) to make the depress "lip". */
function darken(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `rgb(${r}, ${g}, ${b})`;
}

const LIFT = 4; // height of the 3D "lip"

/**
 * A tactile, Duolingo-style button: the colored face sits on a darker lip and
 * physically drops down onto it when pressed (the lip disappears under the
 * face), instead of just scaling. Ghost has no lip — it stays flat.
 */
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
  const animate = useAnimationsEnabled();
  const press = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * LIFT }],
  }));

  const flat = variant === 'ghost';
  const lip =
    variant === 'primary' ? darken(c.amber, 0.28) : variant === 'secondary' ? c.border : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPressIn={() => (press.value = withTiming(animate ? 1 : 0, { duration: animate ? 60 : 0 }))}
      onPressOut={() => (press.value = withTiming(0, { duration: animate ? 110 : 0 }))}
      onPress={(e) => {
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      className={`${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-40' : ''} ${className}`}
      {...rest}
    >
      {/* Base / lip: the face drops onto this when pressed. */}
      <View
        style={{
          borderRadius: 999,
          backgroundColor: lip,
          paddingBottom: flat ? 0 : LIFT,
        }}
      >
        <Animated.View
          style={[faceStyle, {
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            paddingHorizontal: 24,
            paddingVertical: 12,
            backgroundColor: variant === 'primary' ? c.amber : variant === 'secondary' ? c.card : 'transparent',
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: c.borderSoft,
          }]}
        >
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={`shrink text-center text-md font-bold tracking-tight ${VARIANT_TEXT[variant]}`}>{label}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default Button;
