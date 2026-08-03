import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { localStore } from '@/shared/lib/local-store';

import { DefaultMovieBgm } from '../lib/movie-bgm';
import { DefaultMovieStyle } from '../lib/movie-style';
import { movieTitle } from '../lib/movie-title';
import type { Movie, MovieArranger, MovieRender, MovieStyle, SnapRef } from './movie';

/** What the caller gets to decide when a movie is started from picked snaps. */
export type CreateMovieInput = {
  /** The cut list, in order. */
  snapIds: readonly string[];
  /** Optional — a blank name becomes the day the movie was started. */
  title?: string;
  /**
   * Who arranged the cut list. Defaults to `user`: snaps the user picked are
   * ordered by the user, and only template matching may claim otherwise.
   */
  arranger?: MovieArranger;
  /**
   * What the movie should start out looking and sounding like. A template says
   * so; a movie started from the tray takes the defaults and the user changes
   * them once there is a result to change them against.
   */
  style?: MovieStyle;
  bgm?: string;
  /** Injectable for tests; production callers use the default. */
  createdAt?: number;
};

/**
 * The generation settings a style-step edit changes. Every field is optional so
 * one control writes one setting without restating the others.
 */
export type MovieStylePatch = {
  style?: MovieStyle;
  bgm?: string;
  captions?: boolean;
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
  updateMovieStyle: (movieId: string, patch: MovieStylePatch, updatedAt?: number) => void;
  setMovieArranger: (movieId: string, arranger: MovieArranger, updatedAt?: number) => void;
  renameMovie: (movieId: string, title: string, updatedAt?: number) => void;
  deleteMovie: (movieId: string) => void;
  beginMovieJob: (movieId: string, startedAt?: number) => void;
  advanceMovieJob: (movieId: string, stepIndex: number) => void;
  finishMovieJob: (movieId: string, render: MovieRender, updatedAt?: number) => void;
  failMovieJob: (movieId: string, error: string, updatedAt?: number) => void;
  removeSnapsEverywhere: (snapIds: readonly string[]) => void;
  setHasHydrated: (value: boolean) => void;
};

/**
 * Applies `change` to one movie, leaving the state object identical when the
 * movie is unknown or the change is a no-op.
 *
 * Identity matters more here than the brevity: the generation runner re-checks
 * every job on a timer and writes the step it finds, so a write that changed
 * nothing must not produce a new `movies` array — that would re-render every
 * movie surface, and re-run the runner's own effect, several times a second.
 */
function patchMovie(
  state: MovieState,
  movieId: string,
  change: (movie: Movie) => Movie,
): Pick<MovieState, 'movies'> | MovieState {
  const current = state.movies.find((movie) => movie.id === movieId);
  if (!current) return state;
  const next = change(current);
  if (next === current) return state;
  return { movies: state.movies.map((movie) => (movie.id === movieId ? next : movie)) };
}

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
 * the movie screen, after a first result exists.
 */
function createDraft(
  {
    snapIds,
    title,
    arranger,
    style,
    bgm,
    createdAt,
  }: Required<Pick<CreateMovieInput, 'snapIds' | 'createdAt'>> &
    Pick<CreateMovieInput, 'title' | 'arranger' | 'style' | 'bgm'>,
  existing: readonly Movie[],
): Movie {
  return {
    id: uniqueMovieId(`movie-${createdAt}`, new Set(existing.map((movie) => movie.id))),
    title: movieTitle(title, createdAt, new Set(existing.map((movie) => movie.title))),
    status: 'draft',
    createdAt,
    updatedAt: createdAt,
    snapRefs: snapIds.map((snapId, order) => ({ snapId, order })),
    style: style ?? DefaultMovieStyle,
    bgm: bgm ?? DefaultMovieBgm,
    captions: true,
    ratio: '9:16',
    arranger: arranger ?? 'user',
  };
}

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
      createMovie: ({ snapIds, title, arranger, style, bgm, createdAt = Date.now() }) => {
        const movie = createDraft({ snapIds, title, arranger, style, bgm, createdAt }, get().movies);
        set((state) => ({ movies: [...state.movies, movie] }));
        return movie;
      },
      updateMovieCuts: (movieId, snapRefs, updatedAt = Date.now()) =>
        set((state) => patchMovie(state, movieId, (movie) => ({ ...movie, snapRefs, updatedAt }))),
      updateMovieStyle: (movieId, patch, updatedAt = Date.now()) =>
        set((state) =>
          patchMovie(state, movieId, (movie) => {
            const next = { ...movie, ...patch, updatedAt };
            const changed =
              next.style !== movie.style ||
              next.bgm !== movie.bgm ||
              next.captions !== movie.captions;
            return changed ? next : movie;
          }),
        ),
      setMovieArranger: (movieId, arranger, updatedAt = Date.now()) =>
        set((state) =>
          patchMovie(state, movieId, (movie) =>
            movie.arranger === arranger ? movie : { ...movie, arranger, updatedAt },
          ),
        ),
      renameMovie: (movieId, title, updatedAt = Date.now()) =>
        set((state) =>
          patchMovie(state, movieId, (movie) => {
            // The naming rule lives in one place, so a rename lands under the
            // same cap and the same blank-means-the-date default as a creation.
            const taken = new Set(
              state.movies.filter((other) => other.id !== movieId).map((other) => other.title),
            );
            const next = movieTitle(title, movie.createdAt, taken);
            return next === movie.title ? movie : { ...movie, title: next, updatedAt };
          }),
        ),
      deleteMovie: (movieId) =>
        set((state) => ({ movies: state.movies.filter((movie) => movie.id !== movieId) })),
      beginMovieJob: (movieId, startedAt = Date.now()) =>
        set((state) =>
          patchMovie(state, movieId, (movie) => ({
            ...movie,
            status: 'generating',
            // A retry replaces the previous attempt outright: its render is stale
            // and its error is answered by running again.
            job: { id: `job-${startedAt}`, stepIndex: 0, startedAt },
            render: undefined,
            error: undefined,
            updatedAt: startedAt,
          })),
        ),
      // Deliberately does not stamp `updatedAt`: the studio board sorts by it,
      // and a job would otherwise reshuffle the board at every step.
      advanceMovieJob: (movieId, stepIndex) =>
        set((state) =>
          patchMovie(state, movieId, (movie) =>
            movie.job && movie.status === 'generating' && movie.job.stepIndex !== stepIndex
              ? { ...movie, job: { ...movie.job, stepIndex } }
              : movie,
          ),
        ),
      finishMovieJob: (movieId, render, updatedAt = Date.now()) =>
        set((state) =>
          patchMovie(state, movieId, (movie) =>
            movie.status === 'generating'
              ? { ...movie, status: 'ready', render, job: undefined, updatedAt }
              : movie,
          ),
        ),
      // The other way out of `generating`. The job is dropped but the cut list and
      // settings are left exactly as they were: recovery is running the same movie
      // again, so everything the retry needs has to survive the failure.
      failMovieJob: (movieId, error, updatedAt = Date.now()) =>
        set((state) =>
          patchMovie(state, movieId, (movie) =>
            movie.status === 'generating'
              ? { ...movie, status: 'failed', error, job: undefined, updatedAt }
              : movie,
          ),
        ),
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
 * screen on the movie it just made. Never idempotent — asking twice means the
 * user wanted two movies.
 */
export function useCreateMovie(): (input: CreateMovieInput) => Movie {
  return useMovieStore((state) => state.createMovie);
}

/**
 * Replaces a movie's whole cut list in one write. Membership, order, and trim
 * are edited together in the movie screen's cut list, and committing them
 * separately would let a movie exist in a half-applied state between writes.
 */
export function useUpdateMovieCuts(): (
  movieId: string,
  snapRefs: SnapRef[],
  updatedAt?: number,
) => void {
  return useMovieStore((state) => state.updateMovieCuts);
}

/**
 * Writes one or more generation settings. Separate from the cut list because the
 * two are edited on different steps of the wizard and a movie is legible with
 * either one changed alone.
 */
export function useUpdateMovieStyle(): (
  movieId: string,
  patch: MovieStylePatch,
  updatedAt?: number,
) => void {
  return useMovieStore((state) => state.updateMovieStyle);
}

/**
 * Records who owns the cut order. Separate from the cut list because handing
 * arrangement back to the AI changes no cut, and rearranging by hand changes no
 * setting — the two writes answer different questions.
 */
export function useSetMovieArranger(): (
  movieId: string,
  arranger: MovieArranger,
  updatedAt?: number,
) => void {
  return useMovieStore((state) => state.setMovieArranger);
}

/**
 * Renames a movie, through the same rule that named it: over-long titles are cut
 * and a blank one becomes the day the movie was started.
 */
export function useRenameMovie(): (movieId: string, title: string, updatedAt?: number) => void {
  return useMovieStore((state) => state.renameMovie);
}

/**
 * Puts a movie into generation at its first step. The four job actions are the
 * movie's generation lifecycle, and each is a distinct transition — starting
 * discards a previous attempt, advancing is a progress report, and finishing or
 * failing are the two ways out of `generating`.
 */
export function useBeginMovieJob(): (movieId: string, startedAt?: number) => void {
  return useMovieStore((state) => state.beginMovieJob);
}

/** Records which step a running job has reached. A no-op if it is already there. */
export function useAdvanceMovieJob(): (movieId: string, stepIndex: number) => void {
  return useMovieStore((state) => state.advanceMovieJob);
}

/** Completes a running job: the render lands and the movie becomes `ready`. */
export function useFinishMovieJob(): (
  movieId: string,
  render: MovieRender,
  updatedAt?: number,
) => void {
  return useMovieStore((state) => state.finishMovieJob);
}

/**
 * Ends a running job without a render, recording why. The message is what the
 * recovery UI shows, so it is written for the user rather than for a log.
 */
export function useFailMovieJob(): (movieId: string, error: string, updatedAt?: number) => void {
  return useMovieStore((state) => state.failMovieJob);
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
