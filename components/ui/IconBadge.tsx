import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Coerce a possibly-stale/invalid icon string to a real Ionicons glyph.
 * Subject icons are stored in SQLite and may predate the current icon set
 * (the seed only runs once), so an old value could no longer be a valid
 * glyph — which makes Ionicons render a "?" and log an error. This guards
 * every dynamic icon at the render boundary.
 */
export function safeIcon(name: string | null | undefined, fallback: IconName = 'book'): IconName {
  return name && name in Ionicons.glyphMap ? (name as IconName) : fallback;
}

interface Props extends ViewProps {
  name: IconName;
  /** Hex tint — fills the icon and a translucent wash behind it. */
  color: string;
  /** Icon glyph size. */
  size?: number;
  /** Square container size. */
  box?: number;
  /** Rounding: full circle (default) or a softened square. */
  shape?: 'circle' | 'rounded';
  /** Glyph used when `name` isn't a valid Ionicons name. */
  fallback?: IconName;
  className?: string;
}

/**
 * The app's single, consistent way to present an icon emblem: a glyph on a
 * soft tinted wash. Using one primitive everywhere is what keeps the icon
 * language coherent instead of ad-hoc circles of varying sizes.
 */
export function IconBadge({
  name,
  color,
  size = 20,
  box = 40,
  shape = 'circle',
  fallback = 'book',
  className = '',
  style,
  ...rest
}: Props) {
  return (
    <View
      className={`items-center justify-center ${shape === 'circle' ? 'rounded-full' : 'rounded-2xl'} ${className}`}
      style={[{ width: box, height: box, backgroundColor: `${color}1F` }, style]}
      {...rest}
    >
      <Ionicons name={safeIcon(name, fallback)} size={size} color={color} />
    </View>
  );
}

export default IconBadge;
