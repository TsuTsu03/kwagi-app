import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTablet } from '@/hooks/useTablet';

interface Props extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * Centers content in a width-capped column on tablets while staying full
 * bleed on phones. Drop this directly inside a screen's ScrollView so cards
 * and text keep a comfortable measure instead of stretching edge to edge on
 * large displays.
 */
export function Container({ className = '', style, children, ...rest }: Props) {
  const { contentWidth } = useTablet();
  return (
    <View
      className={`w-full ${className}`}
      style={[contentWidth ? { maxWidth: contentWidth, alignSelf: 'center' } : null, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Container;
