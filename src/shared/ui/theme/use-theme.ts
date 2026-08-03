import { Colors } from './theme';

// The app is dark-fixed: video reads better against near-black, and one world
// is no light theme, so the resolved scheme is always 'dark' regardless of the
// OS setting. There is no stored theme preference either — the persisted
// theme-mode store was removed once nothing read it.
export function useResolvedColorScheme(): 'light' | 'dark' {
  return 'dark';
}

export function useTheme() {
  return Colors.dark;
}
