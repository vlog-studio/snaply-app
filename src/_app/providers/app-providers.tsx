import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationBar } from 'expo-navigation-bar';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MovieGenerationGate } from '@/features/compose-movie';
import { PushTokenRegistrar } from '@/features/register-push-token';
import { Colors } from '@/shared/ui/theme';

import { GeofenceGate } from './geofence-gate';
import { queryClient } from './query-client';

// The app is dark-fixed, so navigation chrome always uses the app palette on
// the dark base theme.
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
        {/* The app is always dark; keep the Android navigation bar buttons
            light. No-op on iOS/web. */}
        <NavigationBar style="dark" />
        <PushTokenRegistrar />
        <GeofenceGate />
        {/* Movie generation runs here rather than in the editor: a job is meant
            to keep going after the user leaves the screen, and to be picked back
            up on the next app start if they left before it finished. */}
        <MovieGenerationGate />
        {/* Gesture-handler gestures need this ancestor; expo-router's native
            stack does not provide one. */}
        <GestureHandlerRootView style={styles.root}>{children}</GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
