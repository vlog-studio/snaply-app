import { act, renderHook } from '@testing-library/react-native';

import {
  initSession,
  useClearSession,
  useCurrentUser,
  useIsAuthenticated,
  useSessionHydrated,
  useSessionStore,
  useSetSession,
} from './session-store';
import type { User } from './user';

let mockAuthCallback: ((event: string, session: unknown) => void) | undefined;
const mockUnsubscribe = jest.fn();
const mockStopAutoRefresh = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockAuthCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      },
      signOut: () => mockSignOut(),
    },
  },
  startAuthAutoRefresh: () => mockStopAutoRefresh,
}));

const user: User = { id: 'user-1', displayName: 'Google User', provider: 'google' };

const supabaseSession = {
  user: {
    id: 'user-1',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Google User' },
  },
};

describe('session store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthCallback = undefined;
    // The store is a module-level singleton; reset it so tests stay independent.
    useSessionStore.setState({ user: null, hasHydrated: false });
  });

  it('starts unauthenticated and unhydrated', async () => {
    const { result } = await renderHook(() => ({
      authed: useIsAuthenticated(),
      hydrated: useSessionHydrated(),
    }));

    expect(result.current.authed).toBe(false);
    expect(result.current.hydrated).toBe(false);
  });

  it('marks the session authenticated after setSession', async () => {
    const { result } = await renderHook(() => ({
      authed: useIsAuthenticated(),
      currentUser: useCurrentUser(),
      setSession: useSetSession(),
    }));

    await act(async () => result.current.setSession(user));

    expect(result.current.authed).toBe(true);
    expect(result.current.currentUser).toEqual(user);
  });

  it('signs out of Supabase and returns to unauthenticated after clearSession', async () => {
    const { result } = await renderHook(() => ({
      authed: useIsAuthenticated(),
      setSession: useSetSession(),
      clearSession: useClearSession(),
    }));

    await act(async () => result.current.setSession(user));
    await act(async () => result.current.clearSession());

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(result.current.authed).toBe(false);
  });

  it('mirrors Supabase auth changes and flips hydration on the first event', async () => {
    const { result } = await renderHook(() => ({
      currentUser: useCurrentUser(),
      hydrated: useSessionHydrated(),
    }));

    const cleanup = initSession();
    expect(mockAuthCallback).toBeDefined();

    await act(async () => mockAuthCallback!('SIGNED_IN', supabaseSession));
    expect(result.current.currentUser).toEqual(expect.objectContaining({ id: 'user-1', provider: 'google' }));
    expect(result.current.hydrated).toBe(true);

    await act(async () => mockAuthCallback!('SIGNED_OUT', null));
    expect(result.current.currentUser).toBeNull();

    cleanup();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockStopAutoRefresh).toHaveBeenCalledTimes(1);
  });
});
