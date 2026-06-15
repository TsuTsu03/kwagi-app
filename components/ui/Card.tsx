import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useThemeColors } from '@/hooks/useTheme';

interface Props extends ViewProps {
  className?: string;
  elevated?: boolean;
  /** Optional colored glow (pass a hex) for a soft focus halo. */
  glow?: string;
}

/**
 * Soft, floating "bubble" surface — generous rounding and a diffuse drop
 * shadow so it lifts gently off the backdrop. Pass `glow` for a colored
 * halo that draws focus to celebratory or actionable cards.
 */
export function Card({ className = '', elevated = false, glow, style, children, ...rest }: Props) {
  const c = useThemeColors();
  return (
    <View
      className={`rounded-card border border-bordersoft p-4 ${elevated ? 'bg-card' : 'bg-surface'} ${className}`}
      style={[
        glow
          ? {
              shadowColor: glow,
              shadowOpacity: 0.4,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 8 },
              elevation: 10,
            }
          : {
              shadowColor: c.shadow,
              shadowOpacity: 1,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 5,
            },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Card;
