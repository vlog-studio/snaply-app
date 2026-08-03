import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

import type { Movie } from './movie';

/**
 * Owns movies: their cut lists, generation settings, and lifecycle state.
 * Persisted to a document-directory JSON file through `localStore` (movie data
 * grows over time, so SecureStore is unsuitable). Once movies move to a backend,
 * this becomes a server-backed query/mutation and local persistence is dropped.
 *
 * Movies reference snaps by id only (see `SnapRef`); joining a movie to its snap
 * objects is a higher-layer concern (a page, or `widgets/movie-shelf`) so this
 * entity never imports `entities/snap`.
 *
 * Exported for co-located tests only. Application code consumes the focused
 * selector and action hooks below through the slice Public API.
 */
type MovieState = {
  movies: Movie[];
  hasHydrated: boolean;
  removeSnapsEverywhere: (snapIds: readonly string[]) => void;
  setHasHydrated: (value: boolean) => void;
};

/**
 * Strips every reference to the given snaps from a movie.
 *
 * Remaining references keep their `order` values (gaps are fine, order is only
 * ever read as a sort key). Movies that reference none of the snaps are returned
 * unchanged so their identity survives and their consumers do not re-render.
 */
function withoutSnaps(movie: Movie, removedSnapIds: ReadonlySet<string>): Movie {
  const snapRefs = movie.snapRefs.filter((ref) => !removedSnapIds.has(ref.snapId));
  if (snapRefs.length === movie.snapRefs.length) return movie;
  return { ...movie, snapRefs };
}

export const useMovieStore = create<MovieState>()(
  persist(
    (set) => ({
      movies: [],
      hasHydrated: false,
      removeSnapsEverywhere: (snapIds) =>
        set((state) => {
          const removed = new Set(snapIds);
          if (removed.size === 0) return state;
          return { movies: state.movies.map((movie) => withoutSnaps(movie, removed)) };
        }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'snaply.movies',
      storage: createJSONStorage(() => localStore),
      partialize: (state) => ({ movies: state.movies }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

/** Every movie, in storage order. Presentation order is the shelf's decision. */
export function useMovies(): Movie[] {
  return useMovieStore((state) => state.movies);
}

export function useMovieById(id: string | undefined): Movie | undefined {
  return useMovieStore((state) => (id ? state.movies.find((movie) => movie.id === id) : undefined));
}

export function useMoviesHydrated(): boolean {
  return useMovieStore((state) => state.hasHydrated);
}

/**
 * Drops the given snaps from every movie that references them. This is the movie
 * half of deleting an original: the snap no longer exists, so no movie may keep
 * pointing at it. A movie that loses its last cut is kept — an empty draft is
 * still the user's, and deleting it is a separate, deliberate action.
 */
export function useRemoveSnapsEverywhere(): (snapIds: readonly string[]) => void {
  return useMovieStore((state) => state.removeSnapsEverywhere);
}
