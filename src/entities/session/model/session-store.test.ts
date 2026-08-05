import { act, renderHook } from '@testing-library/react-native';

import {
  exchangeAuthCode,
  initSession,
  useClearSession,
  useCurrentUser,
  useIsAuthenticated,
  useIsRecovering,
  useSessionHydrated,
  useSessionStore,
  useSetSession,
} from './session-store';
import type { User } from './user';

type SessionChange = { user: User | null; isRecovery: boolean };

let mockSessionListener: ((change: SessionChange) => void) | undefined;
const mockUnsubscribe = jest.fn();
const mockEndSession = jest.fn().mockResolvedValue(undefined);
const mockExchangeSessionCode = jest.fn().mockResolvedValue(true);

// The gateway is the store's only backend dependency, so it is also the seam
// the test substitutes — no Supabase shape appears here.
jest.mock('../api/session-gateway', () => ({
  subscribeToSession: (listener: (change: SessionChange) => void) => {
    mockSessionListener = listener;
    return mockUnsubscribe;
  },
  endSession: () => mockEndSession(),
  exchangeSessionCode: (code: string) => mockExchangeSessionCode(code),
}));

const user: User = { id: 'user-1', displayName: 'Google User', provider: 'google' };

describe('session store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionListener = undefined;
    mockExchangeSessionCode.mockResolvedValue(true);
    // The store is a module-level singleton; reset it so tests stay independent.
    useSessionStore.setState({ user: null, hasHydrated: false, isRecovering: false });
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

  it('ends the backend session and returns to unauthenticated after clearSession', async () => {
    const { result } = await renderHook(() => ({
      authed: useIsAuthenticated(),
      setSession: useSetSession(),
      clearSession: useClearSession(),
    }));

    await act(async () => result.current.setSession(user));
    await act(async () => result.current.clearSession());

    expect(mockEndSession).toHaveBeenCalledTimes(1);
    expect(result.current.authed).toBe(false);
  });

  it('mirrors backend session changes and flips hydration on the first event', async () => {
    const { result } = await renderHook(() => ({
      currentUser: useCurrentUser(),
      hydrated: useSessionHydrated(),
    }));

    const cleanup = initSession();
    expect(mockSessionListener).toBeDefined();

    await act(async () => mockSessionListener!({ user, isRecovery: false }));
    expect(result.current.currentUser).toEqual(user);
    expect(result.current.hydrated).toBe(true);

    await act(async () => mockSessionListener!({ user: null, isRecovery: false }));
    expect(result.current.currentUser).toBeNull();

    cleanup();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('enters recovery when the backend reports a password-recovery session', async () => {
    const { result } = await renderHook(() => ({ recovering: useIsRecovering() }));

    initSession();
    await act(async () => mockSessionListener!({ user, isRecovery: true }));

    expect(result.current.recovering).toBe(true);
  });

  it('holds the recovery flag across a code exchange and drops it when the exchange fails', async () => {
    const { result } = await renderHook(() => ({ recovering: useIsRecovering() }));

    await act(async () => {
      await expect(exchangeAuthCode('code-1', { recovery: true })).resolves.toBe(true);
    });
    expect(mockExchangeSessionCode).toHaveBeenCalledWith('code-1');
    expect(result.current.recovering).toBe(true);

    mockExchangeSessionCode.mockResolvedValue(false);
    await act(async () => {
      await expect(exchangeAuthCode('code-2', { recovery: true })).resolves.toBe(false);
    });
    expect(result.current.recovering).toBe(false);
  });
});
