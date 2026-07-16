import { useColorScheme } from 'react-native';

import { Colors } from './theme';
import { useThemeMode } from './theme-mode';

/** The color scheme in effect after applying the user's theme-mode choice. */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const mode = useThemeMode();
  return mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
}

export function useTheme() {
  return Colors[useResolvedColorScheme()];
}
