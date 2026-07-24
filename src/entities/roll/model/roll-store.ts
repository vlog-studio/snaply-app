import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

import { toDayKey } from './day-key';
import type { ClipRef, Reel, Roll, RollStatus } from './roll';

/**
 * Owns rolls: today's-roll selection, clip membership, and development state.
 * Persisted to a document-directory JSON file through `localStore` (roll data
 * grows over time, so SecureStore is unsuitable). Once rolls move to a backend,
 * this becomes a server-backed query/mutation and local persistence is dropped.
 *
 * Rolls reference clips by id only (see `ClipRef`); joining a roll to its clip
 * objects is a higher-layer concern (a page or the develop feature) so this
 * entity never imports `entities/clip`.
 *
 * Exported for co-located tests only. Application code consumes the focused
 * selector and action hooks below through the slice Public API.
 */
type RollState = {
  rolls: Roll[];
  /**
   * Id of the daily roll for the current session's day, set by `ensureDailyRoll`.
   * Ephemeral (not persisted) so it never points at a stale day after relaunch;
   * `ensureDailyRoll` on app entry re-establishes it.
   */
  todayRollId: string | null;
  hasHydrated: boolean;
  addClipToRoll: (rollId: string, clipId: string) => void;
  removeClipFromRoll: (rollId: string, clipId: string) => void;
  reorderRollClips: (rollId: string, orderedClipIds: string[]) => void;
  setRollStatus: (rollId: string, status: RollStatus) => void;
  setRollReel: (rollId: string, reel: Reel) => void;
  setHasHydrated: (value: boolean) => void;
};

/**
 * Builds a fresh daily roll for a day key: character `daily`, collected by the
 * `all-day` rule, portrait, undeveloped, with no clips yet. The id is derived
 * from the day key so repeated creation for the same day is idempotent. The
 * title is a domain default; pages may render "오늘의 롤" for the current day.
 */
function createDailyRoll(dayKey: string, createdAt: number): Roll {
  return {
    id: `daily-${dayKey}`,
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt,
    dayKey,
    title: `${dayKey} 데일리 롤`, // 데일리 롤
    clipRefs: [],
  };
}

function appendClipRef(clipRefs: ClipRef[], clipId: string): ClipRef[] {
  if (clipRefs.some((ref) => ref.clipId === clipId)) return clipRefs;
  const nextOrder = clipRefs.reduce((max, ref) => Math.max(max, ref.order), -1) + 1;
  return [...clipRefs, { clipId, order: nextOrder }];
}

/**
 * Rewrites each reference's `order` to follow `orderedClipIds` (first id →
 * order 0). References not listed keep their relative order after the listed
 * ones, and unknown or duplicate ids are ignored — so a stale caller snapshot
 * can only renumber, never drop or duplicate membership.
 */
function reorderClipRefs(clipRefs: ClipRef[], orderedClipIds: string[]): ClipRef[] {
  const known = new Set(clipRefs.map((ref) => ref.clipId));
  const listed: string[] = [];
  for (const clipId of orderedClipIds) {
    if (known.has(clipId) && !listed.includes(clipId)) listed.push(clipId);
  }
  const position = new Map(listed.map((clipId, index) => [clipId, index]));
  [...clipRefs]
    .filter((ref) => !position.has(ref.clipId))
    .sort((left, right) => left.order - right.order)
    .forEach((ref, index) => position.set(ref.clipId, listed.length + index));
  return clipRefs.map((ref) => ({ ...ref, order: position.get(ref.clipId) ?? ref.order }));
}

export const useRollStore = create<RollState>()(
  persist(
    (set) => ({
      rolls: [],
      todayRollId: null,
      hasHydrated: false,
      addClipToRoll: (rollId, clipId) =>
        set((state) => ({
          rolls: state.rolls.map((roll) =>
            roll.id === rollId ? { ...roll, clipRefs: appendClipRef(roll.clipRefs, clipId) } : roll,
          ),
        })),
      removeClipFromRoll: (rollId, clipId) =>
        set((state) => ({
          rolls: state.rolls.map((roll) =>
            roll.id === rollId
              ? { ...roll, clipRefs: roll.clipRefs.filter((ref) => ref.clipId !== clipId) }
              : roll,
          ),
        })),
      reorderRollClips: (rollId, orderedClipIds) =>
        set((state) => ({
          rolls: state.rolls.map((roll) =>
            roll.id === rollId
              ? { ...roll, clipRefs: reorderClipRefs(roll.clipRefs, orderedClipIds) }
              : roll,
          ),
        })),
      setRollStatus: (rollId, status) =>
        set((state) => ({
          rolls: state.rolls.map((roll) => (roll.id === rollId ? { ...roll, status } : roll)),
        })),
      setRollReel: (rollId, reel) =>
        set((state) => ({
          rolls: state.rolls.map((roll) => (roll.id === rollId ? { ...roll, reel } : roll)),
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'snaply.rolls',
      storage: createJSONStorage(() => localStore),
      partialize: (state) => ({ rolls: state.rolls }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/**
 * Returns today's daily roll, creating it if none exists yet. This is the
 * "today's roll auto-creation" logic: the app or capture feature calls it on
 * entry/capture. `now` is injectable for testing the date boundary; production
 * callers use the default. Idempotent — repeated calls on the same day return
 * the same roll.
 */
export function ensureDailyRoll(now: number = Date.now()): Roll {
  const dayKey = toDayKey(now);
  const existing = useRollStore
    .getState()
    .rolls.find((roll) => roll.type === 'daily' && roll.dayKey === dayKey);
  if (existing) {
    useRollStore.setState({ todayRollId: existing.id });
    return existing;
  }

  const roll = createDailyRoll(dayKey, now);
  useRollStore.setState((state) => ({ rolls: [...state.rolls, roll], todayRollId: roll.id }));
  return roll;
}

export function useRolls(): Roll[] {
  return useRollStore((state) => state.rolls);
}

export function useRollById(id: string | undefined): Roll | undefined {
  return useRollStore((state) => (id ? state.rolls.find((roll) => roll.id === id) : undefined));
}

/**
 * Non-reactive read of a roll by id, for an imperative action (the develop flow)
 * that reads the current roll at call time rather than subscribing.
 */
export function getRollById(id: string): Roll | undefined {
  return useRollStore.getState().rolls.find((roll) => roll.id === id);
}

/**
 * Reactive today's-roll selector. Returns the daily roll established by the most
 * recent `ensureDailyRoll` call, or `undefined` until it has run (call it on app
 * entry). Keeping the "which day is today" decision in the writer keeps this a
 * pure selector — no `Date.now()` during render.
 */
export function useTodayRoll(): Roll | undefined {
  return useRollStore((state) =>
    state.todayRollId ? state.rolls.find((roll) => roll.id === state.todayRollId) : undefined,
  );
}

export function useRollsHydrated(): boolean {
  return useRollStore((state) => state.hasHydrated);
}

export function useAddClipToRoll(): (rollId: string, clipId: string) => void {
  return useRollStore((state) => state.addClipToRoll);
}

export function useRemoveClipFromRoll(): (rollId: string, clipId: string) => void {
  return useRollStore((state) => state.removeClipFromRoll);
}

export function useReorderRollClips(): (rollId: string, orderedClipIds: string[]) => void {
  return useRollStore((state) => state.reorderRollClips);
}

export function useSetRollStatus(): (rollId: string, status: RollStatus) => void {
  return useRollStore((state) => state.setRollStatus);
}

export function useSetRollReel(): (rollId: string, reel: Reel) => void {
  return useRollStore((state) => state.setRollReel);
}
