import { Platform } from 'react-native';

// Darkroom palette — the app is a single world (the darkroom). Colors are drawn
// from film's real workspace: a warm near-black ground under an amber
// safelight, with a cold cyan (lightbox) as the temperature counter-axis.
// The app is dark-fixed (concept §5), so both scheme keys resolve to the same
// darkroom values; `useTheme` always returns this palette.
const darkroom = {
  text: '#F1E6DA', // ink — warm off-white
  background: '#16110D', // ground — warm black-brown, not pure black
  backgroundElement: '#211910', // surface
  backgroundSelected: '#2C2118', // surface raised
  textSecondary: '#A8927E', // ink dim
  border: '#3A2C20', // line
  primary: '#EA5E38', // ember — safelight, main accent / capture
  primaryPressed: '#F2734E',
  onPrimary: '#1A0F0A', // ink on ember (dark, high contrast)
  ai: '#82D6CE', // lumen — cold lightbox glow, used for AI/develop
  aiSoft: '#16302E', // dark cyan surface
  media: '#0E0B08', // film black — negatives, viewfinder
  warmSurface: '#241A12',
  success: '#82D6CE', // lumen reads as the "developed / cool" positive
  successSoft: '#16302E',
  danger: '#F26D6D',
  amber: '#E7A24A', // negative film base — edge-code prints
  lumen: '#82D6CE', // lightbox cool — cold contrast axis
  film: '#0E0B08', // film gate black
} as const;

export const Colors = {
  light: darkroom,
  dark: darkroom,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-body)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-display)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  small: 12,
  medium: 18,
  large: 26,
  xlarge: 34,
  pill: 999,
} as const;

export const MaxContentWidth = 680;
