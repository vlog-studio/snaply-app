import { act, renderHook } from '@testing-library/react-native';

import {
  useClearSession,
  useCurrentUser,
  useIsAuthenticated,
  useSetSession,
} from './session-store';
import type { User } from './user';

jest.mock('@/shared/lib/secure-storage', () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const user: User = { id: 'mock-kakao', displayName: 'Kakao User', provider: 'kakao' };

describe('session store', () => {
  afterEach(async () => {
    // The store is a module-level singleton; reset it so tests stay independent.
    const { result } = await renderHook(() => useClearSession());
    await act(async () => result.current());
  });

  it('starts unauthenticated with no user', async () => {
    const { result } = await renderHook(() => useIsAuthenticated());

    expect(result.current).toBe(false);
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

  it('returns to unauthenticated after clearSession', async () => {
    const { result } = await renderHook(() => ({
      authed: useIsAuthenticated(),
      setSession: useSetSession(),
      clearSession: useClearSession(),
    }));

    await act(async () => result.current.setSession(user));
    await act(async () => result.current.clearSession());

    expect(result.current.authed).toBe(false);
  });
});
