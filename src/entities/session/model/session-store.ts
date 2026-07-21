import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '@/shared/lib/secure-storage';

import type { User } from './user';

type SessionState = {
  user: User | null;
  /** True once the persisted session has been read back from SecureStore. */
  hasHydrated: boolean;
  setSession: (user: User) => void;
  clearSession: () => void;
  setHasHydrated: () => void;
};

/**
 * Owns the session domain: which user (if any) is signed in and when that
 * value is persisted or cleared. The persistence technology lives in
 * `shared/lib/secure-storage`; this store owns the meaning and lifecycle.
 *
 * Exported for co-located tests only. Application code must consume the
 * focused selector hooks below through the slice Public API.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      hasHydrated: false,
      setSession: (user) => set({ user }),
      clearSession: () => set({ user: null }),
      setHasHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: 'snaply.session',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    },
  ),
);

export function useCurrentUser(): User | null {
  return useSessionStore((state) => state.user);
}

export function useIsAuthenticated(): boolean {
  return useSessionStore((state) => state.user !== null);
}

export function useSessionHydrated(): boolean {
  return useSessionStore((state) => state.hasHydrated);
}

export function useSetSession() {
  return useSessionStore((state) => state.setSession);
}

export function useClearSession() {
  return useSessionStore((state) => state.clearSession);
}
