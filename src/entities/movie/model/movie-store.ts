import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

import { movieTitle } from '../lib/movie-title';
import type { Movie, SnapRef } from './movie';

/** What the caller gets to decide when a movie is started from picked snaps. */
export type CreateMovieInput = {
  /** The cut list, in order. */
  snapIds: readonly string[];
  /** Optional — a blank name becomes the day the movie was started. */
  title?: string;
  /** Injectable for tests; production callers use the default. */
  createdAt?: number;
};

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
  createMovie: (input: CreateMovieInput) => Movie;
  updateMovieCuts: (movieId: string, snapRefs: SnapRef[], updatedAt?: number) => void;
  renameMovie: (movieId: string, title: string, updatedAt?: number) => void;
  deleteMovie: (movieId: string) => void;
  removeSnapsEverywhere: (snapIds: readonly string[]) => void;
  setHasHydrated: (value: boolean) => void;
};

/**
 * Keeps a new movie's id off one already stored. Two movies started in the same
 * millisecond is not a real user action, but a duplicate id would make every
 * later write land on both at once, so it is cheap to rule out.
 */
function uniqueMovieId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/**
 * Builds a fresh draft: the given snaps in the given order, the default style
 * and ratio, and no render. Everything else about a movie is decided later, in
 * the editor.
 */
function createDraft(
  {
    snapIds,
    title,
    createdAt,
  }: Required<Pick<CreateMovieInput, 'snapIds' | 'createdAt'>> & Pick<CreateMovieInput, 'title'>,
  existing: readonly Movie[],
): Movie {
  return {
    id: uniqueMovieId(`movie-${createdAt}`, new Set(existing.map((movie) => movie.id))),
    title: movieTitle(title, createdAt, new Set(existing.map((movie) => movie.title))),
    status: 'draft',
    createdAt,
    updatedAt: createdAt,
    snapRefs: snapIds.map((snapId, order) => ({ snapId, order })),
    style: DefaultMovieStyle,
    bgm: DefaultMovieBgm,
    ratio: '9:16',
  };
}

/**
 * What a movie starts as. Both are placeholders until the style step lands and
 * the catalogs move to the server (`GET /styles`, `GET /bgms`).
 */
const DefaultMovieStyle = 'calm';
const DefaultMovieBgm = 'lofi-walk';

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
    (set, get) => ({
      movies: [],
      hasHydrated: false,
      createMovie: ({ snapIds, title, createdAt = Date.now() }) => {
        const movie = createDraft({ snapIds, title, createdAt }, get().movies);
        set((state) => ({ movies: [...state.movies, movie] }));
        return movie;
      },
      updateMovieCuts: (movieId, snapRefs, updatedAt = Date.now()) =>
        set((state) => ({
          movies: state.movies.map((movie) =>
            movie.id === movieId ? { ...movie, snapRefs, updatedAt } : movie,
          ),
        })),
      renameMovie: (movieId, title, updatedAt = Date.now()) =>
        set((state) => ({
          movies: state.movies.map((movie) =>
            movie.id === movieId ? { ...movie, title, updatedAt } : movie,
          ),
        })),
      deleteMovie: (movieId) =>
        set((state) => ({ movies: state.movies.filter((movie) => movie.id !== movieId) })),
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
 * Non-reactive read of a movie by id, for an imperative action (the compose
 * flow) that reads the current movie at call time rather than subscribing.
 */
export function getMovieById(id: string): Movie | undefined {
  return useMovieStore.getState().movies.find((movie) => movie.id === id);
}

/**
 * Starts a movie from picked snaps and returns it, so the caller can open the
 * editor on the movie it just made. Never idempotent — asking twice means the
 * user wanted two movies.
 */
export function useCreateMovie(): (input: CreateMovieInput) => Movie {
  return useMovieStore((state) => state.createMovie);
}

/**
 * Replaces a movie's whole cut list in one write. Membership, order, and trim
 * are edited together in the editor's assemble step, and committing them
 * separately would let a movie exist in a half-applied state between writes.
 */
export function useUpdateMovieCuts(): (
  movieId: string,
  snapRefs: SnapRef[],
  updatedAt?: number,
) => void {
  return useMovieStore((state) => state.updateMovieCuts);
}

export function useRenameMovie(): (movieId: string, title: string, updatedAt?: number) => void {
  return useMovieStore((state) => state.renameMovie);
}

export function useDeleteMovie(): (movieId: string) => void {
  return useMovieStore((state) => state.deleteMovie);
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
