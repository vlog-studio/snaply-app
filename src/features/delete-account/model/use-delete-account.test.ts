import { act, renderHook } from '@testing-library/react-native';

import { useDeleteAccount } from './use-delete-account';

const mockClearSession = jest.fn();

jest.mock('@/entities/session', () => ({
  useClearSession: () => mockClearSession,
}));

const mockDeleteAccount = jest.fn();

jest.mock('../api/delete-account', () => ({
  deleteAccount: () => mockDeleteAccount(),
}));

describe('useDeleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClearSession.mockResolvedValue(undefined);
  });

  it('soft-deletes on the backend and then ends the session', async () => {
    mockDeleteAccount.mockResolvedValue({ purgeAfter: new Date('2026-09-11') });
    const { result } = await renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('keeps the session and surfaces an error when the backend refuses', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('subscription cancel failed'));
    const { result } = await renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(mockClearSession).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('clears the previous error on a retry', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('boom'));
    mockDeleteAccount.mockResolvedValueOnce({ purgeAfter: new Date('2026-09-11') });
    const { result } = await renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount();
    });
    await act(async () => {
      await result.current.deleteAccount();
    });

    expect(result.current.error).toBeNull();
    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });
});
