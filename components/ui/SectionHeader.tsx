import React from 'react';
import { Text, View } from 'react-native';

interface Props {
  title: string;
  /** Optional muted helper line under the title. */
  subtitle?: string;
  /** Optional trailing control (e.g. a "See all" link or count). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent section heading used across screens so content reads as
 * deliberate, grouped sections rather than an undifferentiated stack of
 * cards. Title sits in ink; an optional action aligns to the trailing edge.
 */
export function SectionHeader({ title, subtitle, action, className = '' }: Props) {
  return (
    <View className={`mb-3 flex-row items-end justify-between ${className}`}>
      <View className="flex-1 pr-3">
        <Text className="text-md font-bold tracking-tight text-ink">{title}</Text>
        {!!subtitle && <Text className="mt-0.5 text-sm text-sub">{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

export default SectionHeader;
