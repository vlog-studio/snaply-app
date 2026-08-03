import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

/**
 * How many snaps the tray holds. Same number as `MovieSnapLimit`, deliberately:
 * a full tray is exactly one movie's worth, so "담기" never collects material a
 * movie cannot take. The two constants are stated separately rather than shared
 * because they answer different questions — one bounds a shopping basket, the
 * other bounds a finished movie — and the entities must stay independent.
 */
export const TrayCapacity = 10;

/**
 * What a 담기 actually did, so the caller can report it honestly: adding eight
 * snaps to a tray holding five puts five in and turns three away.
 */
export type TrayAddOutcome = {
  /** Snaps that entered the tray. */
  added: number;
  /** Snaps refused because the tray was full. */
  rejected: number;
};

/**
 * Owns the 담기 트레이 — the snaps picked out for the next movie, in the order
 * they were picked.
 *
 * This is the concept's one invention (§5): choosing a snap does not start a
 * movie, it drops the snap in a basket that survives app restarts, so material
 * can be gathered across several days. The tray is emptied when a movie is
 * started from it.
 *
 * It holds ids only and never imports `entities/snap`: a tray entry is a
 * pointer, and resolving it to a snap is the studio page's join. Ids of snaps
 * that have since been deleted are dropped by `features/delete-snap`.
 *
 * Exported for co-located tests only. Application code consumes the focused
 * selector and action hooks below through the slice Public API.
 */
type TrayState = {
  snapIds: string[];
  hasHydrated: boolean;
  addSnaps: (snapIds: readonly string[]) => TrayAddOutcome;
  removeSnaps: (snapIds: readonly string[]) => void;
  clear: () => void;
  setHasHydrated: (value: boolean) => void;
};

const NoChange: TrayAddOutcome = { added: 0, rejected: 0 };

export const useTrayStore = create<TrayState>()(
  persist(
    (set, get) => ({
      snapIds: [],
      hasHydrated: false,
      addSnaps: (snapIds) => {
        const held = get().snapIds;
        const seen = new Set(held);
        const accepted: string[] = [];
        let rejected = 0;

        for (const snapId of snapIds) {
          // Already in the tray is neither an addition nor a rejection: the snap
          // is where the user wanted it.
          if (seen.has(snapId)) continue;
          if (held.length + accepted.length >= TrayCapacity) {
            rejected += 1;
            continue;
          }
          seen.add(snapId);
          accepted.push(snapId);
        }

        if (accepted.length === 0) {
          return rejected === 0 ? NoChange : { added: 0, rejected };
        }
        set({ snapIds: [...held, ...accepted] });
        return { added: accepted.length, rejected };
      },
      removeSnaps: (snapIds) =>
        set((state) => {
          const removed = new Set(snapIds);
          if (removed.size === 0) return state;
          const next = state.snapIds.filter((snapId) => !removed.has(snapId));
          return next.length === state.snapIds.length ? state : { snapIds: next };
        }),
      clear: () => set((state) => (state.snapIds.length === 0 ? state : { snapIds: [] })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'snaply.tray',
      storage: createJSONStorage(() => localStore),
      partialize: (state) => ({ snapIds: state.snapIds }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/** The tray's snap ids, in the order they were picked. */
export function useTraySnapIds(): string[] {
  return useTrayStore((state) => state.snapIds);
}

export function useTrayHydrated(): boolean {
  return useTrayStore((state) => state.hasHydrated);
}

/**
 * Puts snaps in the tray, keeping the pick order, ignoring ones already there,
 * and refusing everything past {@link TrayCapacity}. The outcome is what lets a
 * screen say "8개 중 5개를 담았어요" instead of silently dropping three.
 */
export function useAddSnapsToTray(): (snapIds: readonly string[]) => TrayAddOutcome {
  return useTrayStore((state) => state.addSnaps);
}

export function useRemoveSnapsFromTray(): (snapIds: readonly string[]) => void {
  return useTrayStore((state) => state.removeSnaps);
}

export function useClearTray(): () => void {
  return useTrayStore((state) => state.clear);
}
