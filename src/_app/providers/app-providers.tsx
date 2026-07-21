import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';

import { PushTokenRegistrar } from '@/features/register-push-token';
import { Colors, useResolvedColorScheme } from '@/shared/ui/theme';

import { queryClient } from './query-client';

export function AppProviders({ children }: PropsWithChildren) {
  const scheme = useResolvedColorScheme();
  const palette = Colors[scheme];
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.backgroundElement,
      text: palette.text,
      border: palette.border,
      notification: palette.ai,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <PushTokenRegistrar />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
