import { Platform } from 'react-native';

// The app's one palette. A warm near-black ground with an ember accent and a
// cold cyan counter-axis; video reads better against near-black than against a
// bright surface, which is why the app is dark-fixed rather than theme-aware.
// Both scheme keys resolve to the same values; `useTheme` always returns this.
const palette = {
  text: '#F1E6DA', // ink — warm off-white
  background: '#16110D', // ground — warm black-brown, not pure black
  backgroundElement: '#211910', // surface
  backgroundSelected: '#2C2118', // surface raised
  textSecondary: '#A8927E', // ink dim
  border: '#3A2C20', // line
  primary: '#EA5E38', // ember — main accent, capture
  primaryPressed: '#F2734E',
  onPrimary: '#1A0F0A', // ink on ember (dark, high contrast)
  ai: '#82D6CE', // lumen — cold glow, used for AI/generation
  media: '#0E0B08', // near-black behind video: frames, viewfinder
  warmSurface: '#241A12', // raised warm panel, for notices
  danger: '#F26D6D',
  amber: '#E7A24A', // warm secondary accent
  lumen: '#82D6CE', // cold contrast axis
} as const;

export const Colors = {
  light: palette,
  dark: palette,
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
  xsmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 24,
  pill: 999,
} as const;

export const MaxContentWidth = 680;
