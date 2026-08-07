import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

/**
 * How far a snap has gotten toward the backend. `pending` is the absence of an
 * entry rather than a stored value, so a freshly captured snap is in the queue
 * without anyone having to write anything.
 */
export type SnapSyncEntry =
  | { status: 'uploading' }
  | { status: 'uploaded'; videoId: string }
  | { status: 'failed'; attempts: number };

export type SnapSyncStatus = SnapSyncEntry['status'] | 'pending';

/**
 * Owns what the backend knows about each snap: the upload state per snap id,
 * the server `videoId` a completed upload earned, and the tombstones of remote
 * videos whose local snap is already gone.
 *
 * Kept apart from the snap store on purpose — a snap is an immutable original,
 * and its sync state is not part of what it is. Several features meet here:
 * `features/upload-snap` (the worker) writes progress and drains tombstones,
 * `features/delete-snap` retires entries into tombstones, and movie creation
 * will read the id mapping once `POST /edit-jobs` is real. Features never
 * import each other, so this entity store is where they communicate.
 *
 * The upload queue is derived, never stored: every snap whose status here is
 * `pending` or a retryable `failed` is queue material. `uploading` entries are
 * deliberately not persisted — a transfer the app died in the middle of must
 * come back as `pending`, not as a phantom in-flight upload.
 *
 * Exported for co-located tests and the worker's non-reactive reads. UI code
 * consumes the selector and action hooks below through the slice Public API.
 */
type SnapSyncState = {
  entries: Record<string, SnapSyncEntry>;
  /** Server videoIds whose local snap was deleted; `DELETE /videos/{id}` is owed. */
  deleteTombstones: string[];
  hasHydrated: boolean;
  markUploading: (snapId: string) => void;
  markUploaded: (snapId: string, videoId: string) => void;
  markUploadFailed: (snapId: string) => void;
  /** Puts every failed snap back in the queue (a manual "다시 시도"). */
  retryFailedUploads: () => void;
  /**
   * Retires deleted snaps: entries are dropped, and any that had reached the
   * server leave a tombstone behind so the remote copy gets deleted too.
   */
  forgetSnaps: (snapIds: readonly string[]) => void;
  /** For an upload that finished after its snap was deleted mid-transfer. */
  addTombstone: (videoId: string) => void;
  clearTombstone: (videoId: string) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useSnapSyncStore = create<SnapSyncState>()(
  persist(
    (set) => ({
      entries: {},
      deleteTombstones: [],
      hasHydrated: false,
      markUploading: (snapId) =>
        set((state) => ({
          entries: { ...state.entries, [snapId]: { status: 'uploading' } },
        })),
      markUploaded: (snapId, videoId) =>
        set((state) => ({
          entries: { ...state.entries, [snapId]: { status: 'uploaded', videoId } },
        })),
      markUploadFailed: (snapId) =>
        set((state) => {
          const previous = state.entries[snapId];
          const attempts = previous?.status === 'failed' ? previous.attempts + 1 : 1;
          return { entries: { ...state.entries, [snapId]: { status: 'failed', attempts } } };
        }),
      retryFailedUploads: () =>
        set((state) => {
          const entries = Object.fromEntries(
            Object.entries(state.entries).filter(([, entry]) => entry.status !== 'failed'),
          );
          return { entries };
        }),
      forgetSnaps: (snapIds) =>
        set((state) => {
          if (snapIds.length === 0) return state;
          const forgotten = new Set(snapIds);
          const entries: Record<string, SnapSyncEntry> = {};
          const tombstoned: string[] = [];
          for (const [snapId, entry] of Object.entries(state.entries)) {
            if (!forgotten.has(snapId)) {
              entries[snapId] = entry;
              continue;
            }
            if (entry.status === 'uploaded') tombstoned.push(entry.videoId);
          }
          if (tombstoned.length === 0 && Object.keys(entries).length === Object.keys(state.entries).length) {
            return state;
          }
          return {
            entries,
            deleteTombstones: mergeTombstones(state.deleteTombstones, tombstoned),
          };
        }),
      addTombstone: (videoId) =>
        set((state) => ({
          deleteTombstones: mergeTombstones(state.deleteTombstones, [videoId]),
        })),
      clearTombstone: (videoId) =>
        set((state) => ({
          deleteTombstones: state.deleteTombstones.filter((id) => id !== videoId),
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'snaply.snap-sync',
      storage: createJSONStorage(() => localStore),
      // `uploading` is a claim about a transfer in this process; persisting it
      // would resurrect it as a lie after a crash. Dropping it here *is* the
      // crash recovery: the snap rehydrates with no entry, which is `pending`.
      partialize: (state) => ({
        entries: Object.fromEntries(
          Object.entries(state.entries).filter(([, entry]) => entry.status !== 'uploading'),
        ),
        deleteTombstones: state.deleteTombstones,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

function mergeTombstones(existing: string[], added: string[]): string[] {
  const merged = new Set(existing);
  for (const videoId of added) merged.add(videoId);
  return merged.size === existing.length ? existing : [...merged];
}

export function useSnapSyncEntries(): Record<string, SnapSyncEntry> {
  return useSnapSyncStore((state) => state.entries);
}

/** Per-cell subscription: only the asked-for snap's status changes re-render. */
export function useSnapSyncStatus(snapId: string): SnapSyncStatus {
  return useSnapSyncStore((state) => state.entries[snapId]?.status ?? 'pending');
}

export function useDeleteTombstones(): string[] {
  return useSnapSyncStore((state) => state.deleteTombstones);
}

/**
 * How many snaps are sitting in the failed state. A count rather than the
 * entries themselves, so the banner showing it does not re-render its screen
 * on every uploading→uploaded progress write.
 */
export function useFailedUploadCount(): number {
  return useSnapSyncStore((state) => {
    let count = 0;
    for (const entry of Object.values(state.entries)) {
      if (entry.status === 'failed') count += 1;
    }
    return count;
  });
}

export function useSnapSyncHydrated(): boolean {
  return useSnapSyncStore((state) => state.hasHydrated);
}

export function useForgetSnapSync(): (snapIds: readonly string[]) => void {
  return useSnapSyncStore((state) => state.forgetSnaps);
}

export function useRetryFailedUploads(): () => void {
  return useSnapSyncStore((state) => state.retryFailedUploads);
}

/** Non-reactive reads for the upload worker's drain loop. */
export function getSnapSyncEntries(): Record<string, SnapSyncEntry> {
  return useSnapSyncStore.getState().entries;
}

export function getDeleteTombstones(): string[] {
  return useSnapSyncStore.getState().deleteTombstones;
}

/**
 * Imperative actions for the upload worker, which progresses snaps from inside
 * an async drain loop rather than from a render. Same writes as the store
 * actions above — these are just entry points that need no hook call.
 */
export function markSnapUploading(snapId: string): void {
  useSnapSyncStore.getState().markUploading(snapId);
}

export function markSnapUploaded(snapId: string, videoId: string): void {
  useSnapSyncStore.getState().markUploaded(snapId, videoId);
}

export function markSnapUploadFailed(snapId: string): void {
  useSnapSyncStore.getState().markUploadFailed(snapId);
}

export function addSnapDeleteTombstone(videoId: string): void {
  useSnapSyncStore.getState().addTombstone(videoId);
}

export function clearSnapDeleteTombstone(videoId: string): void {
  useSnapSyncStore.getState().clearTombstone(videoId);
}
