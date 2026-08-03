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
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        {/* One screen per movie, whatever point of its life it is at: watching a
            finished movie and fixing it are the same visit, so a second route
            would only have meant two places that can edit one cut list. It is a
            pushed screen rather than a tab because it is a task with a beginning
            and an end, and its own back affordance. */}
        <Stack.Screen name="movie/[id]/index" options={{ title: '무비' }} />
        {/* Picking a template is the other way into a movie, and it is a task of
            the same shape: it opens over the studio and leaves on the movie it
            made. */}
        <Stack.Screen name="template/[id]" options={{ title: '템플릿' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated && !isRecovering}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: '회원가입' }} />
        <Stack.Screen name="reset-password" options={{ title: '비밀번호 재설정' }} />
      </Stack.Protected>
    </Stack>
  );
}
