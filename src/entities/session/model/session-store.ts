import { create } from 'zustand';

import { startAuthAutoRefresh, supabase } from '@/shared/lib/supabase';

import { mapSupabaseUser } from './map-user';
import type { User } from './user';

type SessionState = {
  user: User | null;
  /** True once Supabase's initial session has been read back from storage. */
  hasHydrated: boolean;
  /**
   * True while the user is inside a password-recovery session (arrived via a
   * reset deep link). The route guard forces the update-password screen until
   * the new password is set, even though a session technically exists.
   */
  isRecovering: boolean;
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
  isRecovering: false,
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
  } = supabase.auth.onAuthStateChange((event, session) => {
    useSessionStore.setState({
      user: session ? mapSupabaseUser(session.user) : null,
      hasHydrated: true,
      // Belt-and-suspenders: some flows emit this event on a recovery landing.
      // The deep-link handler also sets the flag from the callback URL.
      ...(event === 'PASSWORD_RECOVERY' ? { isRecovering: true } : {}),
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
  useSessionStore.setState({ user: null, isRecovering: false });
}

/**
 * Enter/leave the password-recovery state. `setRecovering` is called by the
 * deep-link handler when a reset link lands; `finishPasswordRecovery` is called
 * by the update-password action once the new password is saved.
 */
export function setRecovering(value: boolean): void {
  useSessionStore.setState({ isRecovering: value });
}

export function finishPasswordRecovery(): void {
  useSessionStore.setState({ isRecovering: false });
}

/**
 * Exchange a PKCE code from an auth email deep link for a session. Called by the
 * `/auth/callback` and `/auth/reset` route handlers. For recovery, the flag is
 * set before the exchange so the guard never flashes the app between "signed in"
 * and "recovering". `onAuthStateChange` mirrors the resulting user. Returns
 * whether the exchange succeeded.
 */
export async function exchangeAuthCode(
  code: string,
  options?: { recovery?: boolean },
): Promise<boolean> {
  if (options?.recovery) setRecovering(true);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (options?.recovery) setRecovering(false);
    if (__DEV__) console.warn('[auth] deep-link code exchange failed:', error.message);
    return false;
  }
  return true;
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

export function useIsRecovering(): boolean {
  return useSessionStore((state) => state.isRecovering);
}

export function useFinishPasswordRecovery(): () => void {
  return finishPasswordRecovery;
}

export function useSetSession(): (user: User) => void {
  return setSessionUser;
}

export function useClearSession(): () => Promise<void> {
  return signOut;
}
