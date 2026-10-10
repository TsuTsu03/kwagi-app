import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dimmed';

const LIP = 5;

interface Props {
  letter: string;
  text: string;
  state: ChoiceState;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/**
 * A chunky answer bubble that presses down onto its lip, pops when it is the right answer,
 * and gives a small shake when it was the wrong pick.
 */
export function ChoiceBubble({ letter, text, state, disabled, onPress, accessibilityLabel }: Props) {
  const c = useThemeColors();
  const animate = useAnimationsEnabled();
  const press = useSharedValue(0);
  const scale = useSharedValue(1);
  const shake = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    if (state === 'correct') scale.value = withSequence(withTiming(1.05, { duration: 110 }), withSpring(1, { damping: 7, stiffness: 200 }));
    if (state === 'wrong') shake.value = withSequence(...[-8, 8, -6, 6, -3, 0].map((x) => withTiming(x, { duration: 55 })));
  }, [animate, scale, shake, state]);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * LIP }] }));
  const outerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: shake.value }] }));

  const tint = state === 'correct' ? c.green : state === 'wrong' ? c.coral : null;
  const face = tint ? `${tint}22` : c.card;
  const border = tint ?? c.border;
  const lip = tint ? shade(tint, 0.35) : c.border;

  return (
    <Animated.View style={[outerStyle, { marginBottom: 12, opacity: state === 'dimmed' ? 0.55 : 1 }]}>
      <Pressable
        onPress={() => { void Haptics.selectionAsync(); onPress(); }}
        onPressIn={() => { press.value = withTiming(animate ? 1 : 0, { duration: 60 }); }}
        onPressOut={() => { press.value = withTiming(0, { duration: 120 }); }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled, selected: state === 'correct' || state === 'wrong' }}
      >
        <View style={{ borderRadius: 22, backgroundColor: lip, paddingBottom: LIP }}>
          <Animated.View style={[faceStyle, { borderRadius: 22, borderWidth: 2, borderColor: border, backgroundColor: c.surface, overflow: 'hidden' }]}>
            <View style={{ backgroundColor: face, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, minHeight: 60 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: border, backgroundColor: tint ?? c.surface }}>
                {tint
                  ? <Ionicons name={state === 'correct' ? 'checkmark' : 'close'} size={18} color={c.bg} />
                  : <Text className="font-rounded text-sm text-sub">{letter}</Text>}
              </View>
              <Text className="ml-3 flex-1 font-roundedsoft text-md leading-6 text-ink">{text}</Text>
            </View>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
