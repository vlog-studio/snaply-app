import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router/stack';

import { AppProviders } from '@/_app/providers';
import '@/_app/styles/global.css';
import { useTheme } from '@/shared/ui/theme';

import { AnimatedSplashOverlay } from './animated-splash-overlay';

void SplashScreen.preventAutoHideAsync();

export function RootLayout() {
  return (
    <AppProviders>
      <AnimatedSplashOverlay />
      <RootStack />
    </AppProviders>
  );
}

function RootStack() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="capture/index" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="capture/record" options={{ headerShown: false }} />
      <Stack.Screen name="capture/editing" options={{ headerShown: false }} />
      <Stack.Screen name="capture/result" options={{ headerShown: false }} />
    </Stack>
  );
}
