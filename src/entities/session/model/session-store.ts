import { create } from 'zustand';

import { startAuthAutoRefresh, supabase } from '@/shared/lib/supabase';

import { mapSupabaseUser } from './map-user';
import type { User } from './user';

type SessionState = {
  user: User | null;
  /** True once Supabase's initial session has been read back from storage. */
  hasHydrated: boolean;
};

/**
 * Owns the app's view of the session. Under the "Supabase owns the session"
 * model the tokens live in the Supabase client (persisted via SecureStore);
 * this store only mirrors the derived `User` so screens and the route guard can
 * react synchronously. `initSession` is the single writer for Supabase-driven
 * changes (restore on launch, token refresh, sign-out).
 *
 * Exported for co-located tests only. Application code must consume the focused
 * selector hooks below through the slice Public API.
 */
export const useSessionStore = create<SessionState>()(() => ({
  user: null,
  hasHydrated: false,
}));

/**
 * Subscribe the store to Supabase auth changes and start lifecycle-bound token
 * refresh. Call once from the root layout; returns a cleanup function. The
 * subscription fires immediately with the restored (or absent) initial session,
 * which is what flips `hasHydrated` and releases the splash overlay.
 */
export function initSession(): () => void {
  const stopAutoRefresh = startAuthAutoRefresh();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({
      user: session ? mapSupabaseUser(session.user) : null,
      hasHydrated: true,
    });
  });

  return () => {
    subscription.unsubscribe();
    stopAutoRefresh();
  };
}

/**
 * Write a user into the store directly. Used by the sign-in action for
 * immediate feedback (and by the offline mock provider, which never touches
 * Supabase); the Supabase listener reconciles the same value for real sign-ins.
 */
export function setSessionUser(user: User): void {
  useSessionStore.setState({ user });
}

/** Sign out of Supabase; the auth listener clears the mirrored user. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  useSessionStore.setState({ user: null });
}

export function useCurrentUser(): User | null {
  return useSessionStore((state) => state.user);
}

export function useIsAuthenticated(): boolean {
  return useSessionStore((state) => state.user !== null);
}

export function useSessionHydrated(): boolean {
  return useSessionStore((state) => state.hasHydrated);
}

export function useSetSession(): (user: User) => void {
  return setSessionUser;
}

export function useClearSession(): () => Promise<void> {
  return signOut;
}
