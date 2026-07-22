import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';

import { PushTokenRegistrar } from '@/features/register-push-token';
import { Colors, useResolvedColorScheme } from '@/shared/ui/theme';

import { GeofenceGate } from './geofence-gate';
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
        {/* Follows the app's resolved theme, not the OS scheme ('auto'), so an
            explicit light/dark choice in Settings also recolors the Android
            3-button navigation bar buttons. No-op on iOS/web. */}
        <NavigationBar style={scheme === 'dark' ? 'dark' : 'light'} />
        <PushTokenRegistrar />
        <GeofenceGate />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
