import { act, renderHook } from '@testing-library/react-native';

import { useSignIn } from './use-sign-in';

const mockSetSession = jest.fn();

jest.mock('@/entities/session', () => ({
  useSetSession: () => mockSetSession,
}));

describe('useSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes a session for the chosen provider and settles without pending or error', async () => {
    const { result } = await renderHook(() => useSignIn());

    await act(async () => {
      await result.current.signIn('google');
    });

    expect(mockSetSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'mock-google', provider: 'google' }),
    );
    expect(result.current.pendingProvider).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
