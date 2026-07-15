import { DefaultTheme, ThemeProvider } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { Colors } from '@/shared/ui/theme';

export function AppProviders({ children }: PropsWithChildren) {
  const palette = Colors.light;
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.backgroundElement,
      text: palette.text,
      border: palette.border,
      notification: palette.ai,
    },
  };

  return <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>;
}
