import { useWindowDimensions } from 'react-native';

export function useTablet() {
  const { width } = useWindowDimensions();
  return {
    width,
    isTablet: width >= 768,
    isLargeTablet: width >= 1024,
    columns: width >= 768 ? 2 : 1,
  };
}
