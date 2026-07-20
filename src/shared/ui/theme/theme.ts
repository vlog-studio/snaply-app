import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1A2E',
    background: '#FAFAF7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFF0EA',
    textSecondary: '#6C6B78',
    border: '#ECE8E3',
    primary: '#FF6B35',
    primaryPressed: '#E85A28',
    onPrimary: '#FFFFFF',
    ai: '#7C3AED',
    aiSoft: '#F1EAFE',
    media: '#12172E',
    warmSurface: '#FFF3EE',
    success: '#2EAD71',
    successSoft: '#E8F8F0',
    danger: '#E24B4B',
  },
  dark: {
    text: '#FFFDF9',
    background: '#101326',
    backgroundElement: '#181C36',
    backgroundSelected: '#33253A',
    textSecondary: '#B8B9C5',
    border: '#2B304D',
    primary: '#FF7747',
    primaryPressed: '#FF8B63',
    onPrimary: '#FFFFFF',
    ai: '#9B7AF5',
    aiSoft: '#27203F',
    media: '#090C1B',
    warmSurface: '#2B2026',
    success: '#4AC98A',
    successSoft: '#1E3A2C',
    danger: '#FF7373',
  },
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

export const BottomTabInset = Platform.select({ ios: 80, android: 82, web: 92 }) ?? 0;
export const MaxContentWidth = 680;
