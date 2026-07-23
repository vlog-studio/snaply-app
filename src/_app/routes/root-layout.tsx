import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';

import { AppProviders } from '@/_app/providers';
import '@/_app/styles/global.css';
import {
  initSession,
  useIsAuthenticated,
  useIsRecovering,
  useSessionHydrated,
} from '@/entities/session';
import { FilmGrain } from '@/shared/ui/film-grain';
import { useTheme } from '@/shared/ui/theme';

import { AnimatedSplashOverlay } from './animated-splash-overlay';
import './register-background-tasks';

void SplashScreen.preventAutoHideAsync();

export function RootLayout() {
  // Mirror Supabase's auth state into the session store and bind token refresh
  // to the app lifecycle for as long as the app is mounted. Auth email deep
  // links are handled by the `auth/callback` and `auth/reset` route screens.
  useEffect(() => initSession(), []);

  return (
    <AppProviders>
      <AnimatedSplashOverlay />
      <RootStack />
      {/* Faint grain over the whole darkroom. Decorative and non-interactive. */}
      <FilmGrain />
    </AppProviders>
  );
}

function RootStack() {
  const theme = useTheme();
  const hasHydrated = useSessionHydrated();
  const isAuthenticated = useIsAuthenticated();
  const isRecovering = useIsRecovering();

  // Keep the splash overlay in place until the persisted session is read back,
  // so an authenticated user never sees a flash of the sign-in screen.
  if (!hasHydrated) return null;

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
      {/* Auth email deep-link landing screens. Declared outside every guard so
          the link resolves regardless of auth state; each exchanges the code and
          redirects (see AuthCallbackPage). */}
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      <Stack.Screen name="auth/reset" options={{ headerShown: false }} />

      {/* A password-recovery deep link signs the user in but must not reach the
          app until a new password is set — this takes precedence over the
          authenticated group below. */}
      <Stack.Protected guard={isRecovering}>
        <Stack.Screen
          name="update-password"
          options={{ title: '새 비밀번호 설정', headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && !isRecovering}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="capture/index"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen name="capture/record" options={{ headerShown: false }} />
        <Stack.Screen name="capture/editing" options={{ headerShown: false }} />
        <Stack.Screen name="capture/result" options={{ headerShown: false }} />
        <Stack.Screen name="roll/[id]" options={{ title: '롤 상세' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated && !isRecovering}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: '회원가입' }} />
        <Stack.Screen name="reset-password" options={{ title: '비밀번호 재설정' }} />
      </Stack.Protected>
    </Stack>
  );
}
