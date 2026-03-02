import { useColorScheme } from 'react-native';
import { Colors, DarkColors } from '../theme/colors';

export type { AppColors } from '../theme/colors';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? DarkColors : Colors,
    isDark,
  };
}
