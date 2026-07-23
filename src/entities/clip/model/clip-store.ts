import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

import type { Clip } from './clip';

/**
 * Owns the archive of captured clips (their metadata). The source video files
 * live on disk via `shared/lib/recording-files`; this store keeps the clip
 * metadata and is persisted to a document-directory JSON file through
 * `localStore` (clip data grows without bound, so SecureStore is unsuitable).
 *
 * Once clips move to a backend, this becomes a server-backed query/mutation and
 * the local persistence is dropped.
 *
 * Clips are immutable "negatives": callers add and remove whole clips; roll
 * edits (trim/order) live on the roll's references, never here. `addClip` takes
 * a fully-formed `Clip` so id/timestamp generation stays in the capture feature
 * that owns those side effects, keeping this store deterministic and testable.
 *
 * Exported for co-located tests only. Application code consumes the focused
 * selector and action hooks below through the slice Public API.
 */
type ClipState = {
  clips: Clip[];
  hasHydrated: boolean;
  addClip: (clip: Clip) => void;
  removeClip: (id: string) => void;
  setClipTags: (id: string, tags: string[]) => void;
  setHasHydrated: (value: boolean) => void;
};

export const useClipStore = create<ClipState>()(
  persist(
    (set) => ({
      clips: [],
      hasHydrated: false,
      addClip: (clip) =>
        set((state) =>
          state.clips.some((existing) => existing.id === clip.id)
            ? state
            : { clips: [clip, ...state.clips] },
        ),
      removeClip: (id) =>
        set((state) => ({ clips: state.clips.filter((clip) => clip.id !== id) })),
      setClipTags: (id, tags) =>
        set((state) => ({
          clips: state.clips.map((clip) => (clip.id === id ? { ...clip, tags } : clip)),
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'snaply.clips',
      storage: createJSONStorage(() => localStore),
      partialize: (state) => ({ clips: state.clips }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

export function useClips(): Clip[] {
  return useClipStore((state) => state.clips);
}

export function useClipById(id: string | undefined): Clip | undefined {
  return useClipStore((state) => (id ? state.clips.find((clip) => clip.id === id) : undefined));
}

export function useClipsHydrated(): boolean {
  return useClipStore((state) => state.hasHydrated);
}

export function useAddClip(): (clip: Clip) => void {
  return useClipStore((state) => state.addClip);
}

export function useRemoveClip(): (id: string) => void {
  return useClipStore((state) => state.removeClip);
}

export function useSetClipTags(): (id: string, tags: string[]) => void {
  return useClipStore((state) => state.setClipTags);
}

/**
 * Non-reactive read of the clips for a set of ids, preserving the id order.
 * Used to resolve a roll's clip references to clips from an imperative context
 * (a page's join, the develop flow) without subscribing to the store.
 */
export function getClipsByIds(ids: string[]): Clip[] {
  const byId = new Map(useClipStore.getState().clips.map((clip) => [clip.id, clip]));
  return ids
    .map((id) => byId.get(id))
    .filter((clip): clip is Clip => clip !== undefined);
}
