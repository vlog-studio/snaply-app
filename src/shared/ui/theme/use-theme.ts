import { Colors } from './theme';

// The app is dark-fixed: it is a single world, the darkroom (concept §5). There
// is no light theme, so the resolved scheme is always 'dark' regardless of the
// OS setting or any stored theme-mode preference.
export function useResolvedColorScheme(): 'light' | 'dark' {
  return 'dark';
}

export function useTheme() {
  return Colors.dark;
}
