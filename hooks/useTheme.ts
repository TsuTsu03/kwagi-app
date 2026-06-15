import { useColorScheme } from 'nativewind';
import { darkColors, lightColors, type ThemeColors } from '@/constants/theme';

/**
 * Active palette for inline (non-className) colors — icon tints, shadows,
 * SVG fills, ProgressBar colors, etc. Follows the theme set via
 * `colorScheme.set()` (see the root layout + Settings toggle).
 */
export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'light' ? lightColors : darkColors;
}

export function useIsDark(): boolean {
  const { colorScheme } = useColorScheme();
  return colorScheme !== 'light';
}
