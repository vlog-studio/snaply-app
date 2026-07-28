import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PushTokenRegistrar } from '@/features/register-push-token';
import { Colors } from '@/shared/ui/theme';

import { DailyRollGate } from './daily-roll-gate';
import { GeofenceGate } from './geofence-gate';
import { queryClient } from './query-client';

// The app is dark-fixed (the darkroom), so navigation chrome always uses the
// darkroom palette on the dark base theme.
const palette = Colors.dark;
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.primary,
    background: palette.background,
    card: palette.backgroundElement,
    text: palette.text,
    border: palette.border,
    notification: palette.ai,
  },
};

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        {/* The darkroom is always dark; keep the Android navigation bar buttons
            light. No-op on iOS/web. */}
        <NavigationBar style="dark" />
        <PushTokenRegistrar />
        <GeofenceGate />
        <DailyRollGate />
        {/* Gesture-handler gestures (the roll-detail drag reorder) need this
            ancestor; expo-router's native stack does not provide one. */}
        <GestureHandlerRootView style={styles.root}>{children}</GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
