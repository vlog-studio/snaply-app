import { useState } from 'react';

import { useSetSession, type SocialProvider } from '@/entities/session';

import type { AuthProvider } from './auth-provider';
import { mockAuthProvider } from './mock-auth-provider';

const SIGN_IN_ERROR_MESSAGE = '로그인에 실패했어요. 잠시 후 다시 시도해 주세요.';

// Swap this binding for a real AuthProvider implementation once a backend or
// BaaS is chosen; the rest of the sign-in flow stays unchanged.
const authProvider: AuthProvider = mockAuthProvider;

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
    } catch {
      setError(SIGN_IN_ERROR_MESSAGE);
    } finally {
      setPendingProvider(null);
    }
  }

  return { signIn, pendingProvider, error };
}
