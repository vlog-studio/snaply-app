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

/**
 * The type scale — one entry per size step, each pairing a size with its
 * leading. `ThemedText` maps its `type` names onto these steps and adds only
 * what makes a role: family, weight, letter spacing, casing. Text that cannot
 * be a `ThemedText` (a `TextInput`, a glyph drawn over video) still takes its
 * size from here rather than inlining a literal.
 *
 * Sizes step about 1.25× from `heading` up (21 → 26 → 32 → 42) and tighten
 * below it (11 → 12 → 14 → 16); they follow the ratio, not a grid.
 *
 * Every leading, on the other hand, is a multiple of 4, so a row's height stays
 * predictable and stacked text keeps a vertical rhythm. Within that grid the
 * leading is loosest where text wraps and is read as prose (1.43–1.5 at 14–16px)
 * and tightens as the type grows (1.25 at `title`, 1.14 at `display`), because
 * large type reads as gappy at body leading. `micro` and `xsmall` share 16: it is
 * the smallest grid step that clears 12px, which makes 11px the looser of the two
 * by arithmetic rather than by choice.
 */
export const Typography = {
  micro: { fontSize: 11, lineHeight: 16 },
  xsmall: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 24 },
  heading: { fontSize: 21, lineHeight: 28 },
  subtitle: { fontSize: 26, lineHeight: 32 },
  title: { fontSize: 32, lineHeight: 40 },
  display: { fontSize: 42, lineHeight: 48 },
} as const;

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
