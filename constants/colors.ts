/**
 * Static color token export (the DARK palette) for back-compat and for
 * surfaces that look identical in both themes (e.g. the owl's brown body).
 *
 * For anything theme-sensitive — icon tints, backgrounds, shadows, SVG
 * fills on themed surfaces — use `useThemeColors()` from `@/hooks/useTheme`
 * so it follows the active light/dark theme.
 */
import { darkColors } from '@/constants/theme';

export const colors = darkColors;

export type ColorToken = keyof typeof colors;
