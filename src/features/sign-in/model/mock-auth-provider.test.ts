import type { SocialProvider } from '@/entities/session';

import { mockAuthProvider } from './mock-auth-provider';

describe('mockAuthProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each<SocialProvider>(['google', 'apple'])(
    'returns a deterministic user for %s',
    async (provider) => {
      const pending = mockAuthProvider.signIn(provider);
      await jest.advanceTimersByTimeAsync(600);
      const user = await pending;

      expect(user).toEqual(
        expect.objectContaining({ id: `mock-${provider}`, provider }),
      );
      expect(user.displayName.length).toBeGreaterThan(0);
    },
  );
});
