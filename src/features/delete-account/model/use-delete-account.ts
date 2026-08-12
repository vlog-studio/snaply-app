import { useState } from 'react';

import { useClearSession } from '@/entities/session';

import { deleteAccount } from '../api/delete-account';

const DELETE_ERROR_MESSAGE = '계정을 삭제하지 못했어요. 다시 시도해 주세요.';

/**
 * The delete-account action: soft-delete on the backend, then end the local
 * session. Signing out is what hands the user to the sign-in screen — the
 * route guard reacts to the cleared session, so the hook never navigates.
 *
 * A backend failure (e.g. the subscription cancel failed, which aborts the
 * whole deletion server-side) leaves the session intact so the user can retry.
 */
export function useDeleteAccount() {
  const clearSession = useClearSession();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(): Promise<void> {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      await deleteAccount();
      await clearSession();
    } catch {
      setError(DELETE_ERROR_MESSAGE);
    } finally {
      setIsPending(false);
    }
  }

  return { deleteAccount: run, isPending, error };
}
