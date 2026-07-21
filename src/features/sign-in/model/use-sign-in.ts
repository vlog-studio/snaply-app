import { useState } from 'react';

import { useSetSession, type SocialProvider } from '@/entities/session';

import type { AuthProvider } from './auth-provider';
import { SignInCancelledError, supabaseAuthProvider } from './supabase-auth-provider';

const SIGN_IN_ERROR_MESSAGE = '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.';

// Real authentication over Supabase Auth. Swap to `mockAuthProvider` for
// offline development without Supabase credentials; the rest of the sign-in
// flow stays unchanged.
const authProvider: AuthProvider = supabaseAuthProvider;

/**
 * Orchestrates the sign-in action: runs the provider, writes the resulting
 * user into the session store, and exposes the pending/error state a screen
 * needs. Navigation is handled declaratively by the root route guard once the
 * session becomes authenticated, so this hook does not navigate.
 */
export function useSignIn() {
  const setSession = useSetSession();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: SocialProvider): Promise<void> {
    if (pendingProvider) return;
    setPendingProvider(provider);
    setError(null);
    try {
      const user = await authProvider.signIn(provider);
      setSession(user);
    } catch (cause) {
      // A user-cancelled browser dismissal is not a failure — stay silent.
      if (!(cause instanceof SignInCancelledError)) setError(SIGN_IN_ERROR_MESSAGE);
    } finally {
      setPendingProvider(null);
    }
  }

  return { signIn, pendingProvider, error };
}
