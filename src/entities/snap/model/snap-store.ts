import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

import type { Snap } from './snap';

/**
 * Owns the library of captured snaps (their metadata). The source video files
 * live on disk via `shared/lib/recording-files`; this store keeps the snap
 * metadata and is persisted to a document-directory JSON file through
 * `localStore` (snap data grows without bound, so SecureStore is unsuitable).
 *
 * Once snaps move to a backend, this becomes a server-backed query/mutation and
 * the local persistence is dropped.
 *
 * Snaps are immutable originals: callers add and remove whole snaps; movie edits
 * (trim/order) live on the movie's references, never here. `addSnap` takes a
 * fully-formed `Snap` so id/timestamp generation stays in the capture feature
 * that owns those side effects, keeping this store deterministic and testable.
 *
 * `setMeasuredDuration` is the one exception, and it is a correction rather than
 * an edit: it writes the length that was read back from the snap's own file over
 * the length that was assumed when it was captured. Nothing about the snap
 * changes — what it always was is finally recorded.
 *
 * Exported for co-located tests only. Application code consumes the focused
 * selector and action hooks below through the slice Public API.
 */
type SnapState = {
  snaps: Snap[];
  hasHydrated: boolean;
  addSnap: (snap: Snap) => void;
  removeSnaps: (ids: readonly string[]) => void;
  setMeasuredDuration: (id: string, durationSec: number) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useSnapStore = create<SnapState>()(
  persist(
    (set) => ({
      snaps: [],
      hasHydrated: false,
      addSnap: (snap) =>
        set((state) =>
          state.snaps.some((existing) => existing.id === snap.id)
            ? state
            : { snaps: [snap, ...state.snaps] },
        ),
      removeSnaps: (ids) =>
        set((state) => {
          const removed = new Set(ids);
          if (removed.size === 0) return state;
          return { snaps: state.snaps.filter((snap) => !removed.has(snap.id)) };
        }),
      setMeasuredDuration: (id, durationSec) =>
        set((state) => {
          let corrected = false;
          const snaps = state.snaps.map((snap) => {
            if (snap.id !== id) return snap;
            if (snap.durationMeasured && snap.durationSec === durationSec) return snap;
            corrected = true;
            return { ...snap, durationSec, durationMeasured: true };
          });
          // A no-op correction must not write: the backfill walks the whole
          // library on every start, and a new object each time would persist the
          // file and re-render every screen holding snaps for nothing.
          return corrected ? { snaps } : state;
        }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'snaply.snaps',
      storage: createJSONStorage(() => localStore),
      partialize: (state) => ({ snaps: state.snaps }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export function useSnaps(): Snap[] {
  return useSnapStore((state) => state.snaps);
}

export function useSnapsHydrated(): boolean {
  return useSnapStore((state) => state.hasHydrated);
}

export function useAddSnap(): (snap: Snap) => void {
  return useSnapStore((state) => state.addSnap);
}

/**
 * Drops several snaps in one write. Batch deletion goes through this rather
 * than looping a single remove, so a batch persists the snap file once instead
 * of once per snap.
 */
export function useRemoveSnaps(): (ids: readonly string[]) => void {
  return useSnapStore((state) => state.removeSnaps);
}

/**
 * Records the length read back from a snap's own file, replacing the length that
 * was assumed at capture time. See the store's note on why this is the one write
 * that changes a stored snap.
 */
export function useSetMeasuredSnapDuration(): (id: string, durationSec: number) => void {
  return useSnapStore((state) => state.setMeasuredDuration);
}

/**
 * Non-reactive read of the whole library. For work that walks every snap once
 * and must not restart whenever its own writes land back in the store — the
 * duration backfill is the only such caller today.
 */
export function getSnaps(): Snap[] {
  return useSnapStore.getState().snaps;
}

/**
 * Non-reactive read of the snaps for a set of ids, preserving the id order.
 * Used to resolve a movie's snap references from an imperative context (a
 * page's join, the compose flow) without subscribing to the store.
 */
export function getSnapsByIds(ids: string[]): Snap[] {
  const byId = new Map(useSnapStore.getState().snaps.map((snap) => [snap.id, snap]));
  return ids.map((id) => byId.get(id)).filter((snap): snap is Snap => snap !== undefined);
}
