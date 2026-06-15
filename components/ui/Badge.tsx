import React from 'react';
import { Text, View } from 'react-native';
import { useThemeColors } from '@/hooks/useTheme';

interface Props {
  label: string;
  color?: string; // hex; defaults to amber-tinted
  className?: string;
}

/** Soft pill badge. `color` tints text, a translucent fill, and a hairline edge. */
export function Badge({ label, color, className = '' }: Props) {
  const c = useThemeColors();
  const tint = color ?? c.amber;
  return (
    <View
      className={`self-start rounded-pill px-2.5 py-1 ${className}`}
      style={{ backgroundColor: `${tint}22`, borderWidth: 1, borderColor: `${tint}33` }}
    >
      <Text className="text-xs font-semibold tracking-tight" style={{ color: tint }}>
        {label}
      </Text>
    </View>
  );
}

export default Badge;
