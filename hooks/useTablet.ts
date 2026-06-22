import { useWindowDimensions } from 'react-native';

export function useTablet() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  return {
    width,
    isTablet,
    isLargeTablet,
    columns: isTablet ? 2 : 1,
    /**
     * Max width for a centered reading column. On phones content is full
     * bleed; on tablets it caps so cards and text don't stretch into
     * unreadable ocean-wide lines.
     */
    contentWidth: isLargeTablet ? 760 : isTablet ? 680 : undefined,
  };
}
