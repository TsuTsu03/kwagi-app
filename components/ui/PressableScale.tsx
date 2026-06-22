import React, { useState } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props extends Omit<PressableProps, 'style'> {
  className?: string;
  /** How far it shrinks while held. 0.96 by default — felt, not floppy. */
  pressedScale?: number;
  /** How much it dims while held. 1 disables the dim. */
  pressedOpacity?: number;
  /** Light selection haptic on press-in. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * The app's standard tappable surface. A plain RN `Pressable` gives no
 * feedback, which is what makes content feel dead under the finger. This
 * scales + dims it while held (and fires a light haptic), so every card,
 * chip, and row responds the instant it's touched.
 *
 * Built on a plain `Pressable` so NativeWind's `className` -> `style` mapping
 * works natively (an `Animated.createAnimatedComponent(Pressable)` silently
 * drops className when an animated style is also passed). Press feedback is
 * driven by pressed state, which is plenty snappy for a tap.
 */
export function PressableScale({
  className = '',
  pressedScale = 0.96,
  pressedOpacity = 0.94,
  haptic = true,
  disabled,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: Props) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      className={className}
      style={[
        {
          transform: [{ scale: pressed ? pressedScale : 1 }],
          opacity: pressed ? pressedOpacity : 1,
        },
        style,
      ]}
      onPressIn={(e) => {
        setPressed(true);
        if (haptic) void Haptics.selectionAsync();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

export default PressableScale;
