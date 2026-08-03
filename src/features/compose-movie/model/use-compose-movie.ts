import { useCallback } from 'react';

import {
  MovieSnapLimit,
  getMovieById,
  useBeginMovieJob,
  useCreateMovie,
  useUpdateMovieCuts,
  useUpdateMovieStyle,
  type Movie,
  type MovieStylePatch,
  type SnapRef,
} from '@/entities/movie';
import { useClearTray, useTraySnapIds } from '@/entities/tray';

/**
 * Why a cut edit was refused, or `undefined` when it landed.
 *
 * `frozen` — the movie is generating or already finished, so its cuts are fixed.
 * `empty` — a movie must keep at least one cut; the editor offers deletion for
 * the case where the user really wants none.
 * `full` — the change would push past {@link MovieSnapLimit}.
 */
export type CutsRefusal = 'frozen' | 'empty' | 'full';

export type CutsOutcome = {
  /** Cuts the movie ended up holding. Unchanged from before when refused. */
  cutCount: number;
  refused?: CutsRefusal;
};

/**
 * Why generation would not start.
 *
 * `frozen` — a job already owns the movie, or it is finished.
 * `empty` — there is nothing to generate from.
 */
export type GenerationRefusal = 'frozen' | 'empty';

export type GenerationOutcome = {
  started: boolean;
  refused?: GenerationRefusal;
};

/**
 * A movie's cuts and settings may only be edited before a generation job takes
 * it over. `failed` stays editable, so a broken attempt can be fixed and run
 * again; `ready` does not, because changing a finished movie means regenerating
 * it, which is a different action.
 */
function canEdit(movie: Movie): boolean {
  return movie.status === 'draft' || movie.status === 'failed';
}

/**
 * Turning picked material into a movie, and committing the editor's cut list.
 *
 * It spans the tray and the movie — starting a movie empties the tray — which is
 * what makes it a feature rather than page code. Concentrating it here also
 * concentrates the rules that guard it: at least one cut, at most
 * {@link MovieSnapLimit}, and no cut edits once a generation job owns the movie.
 * Enforcing those only in the UI would leave each one a forgotten `disabled`
 * prop away from being bypassed.
 *
 * The movie is read at call time rather than subscribed to: these run from event
 * handlers, and the current movie is what the write must be checked against.
 */
export function useComposeMovie() {
  const traySnapIds = useTraySnapIds();
  const clearTray = useClearTray();
  const createMovie = useCreateMovie();
  const updateMovieCuts = useUpdateMovieCuts();
  const updateMovieStyle = useUpdateMovieStyle();
  const beginMovieJob = useBeginMovieJob();

  /**
   * Starts a draft from everything in the tray and empties the tray, returning
   * the movie so the caller can open the editor on it. An empty tray makes
   * nothing — a movie with no cuts is a dead end.
   */
  const startMovieFromTray = useCallback((): Movie | undefined => {
    if (traySnapIds.length === 0) return undefined;
    const movie = createMovie({ snapIds: traySnapIds });
    clearTray();
    return movie;
  }, [traySnapIds, createMovie, clearTray]);

  /**
   * Commits the editor's working cut list. Order is rewritten to the list's own
   * order, so a caller never has to renumber; the trim it carries is kept.
   */
  const saveCuts = useCallback(
    (movieId: string, snapRefs: readonly SnapRef[]): CutsOutcome => {
      const movie = getMovieById(movieId);
      if (!movie) return { cutCount: 0, refused: 'frozen' };
      if (!canEdit(movie)) return { cutCount: movie.snapRefs.length, refused: 'frozen' };
      if (snapRefs.length === 0) return { cutCount: movie.snapRefs.length, refused: 'empty' };
      if (snapRefs.length > MovieSnapLimit) {
        return { cutCount: movie.snapRefs.length, refused: 'full' };
      }

      const renumbered = snapRefs.map((ref, order) => ({ ...ref, order }));
      updateMovieCuts(movieId, renumbered);
      return { cutCount: renumbered.length };
    },
    [updateMovieCuts],
  );

  /**
   * Appends snaps to the end of a movie's cut list — the editor's "스냅 더 넣기".
   * Snaps the movie already holds are skipped rather than duplicated, and the
   * whole batch is refused if it would not fit, so the user is never left
   * guessing which half went in.
   */
  const appendSnaps = useCallback(
    (movieId: string, snapIds: readonly string[]): CutsOutcome => {
      const movie = getMovieById(movieId);
      if (!movie) return { cutCount: 0, refused: 'frozen' };
      if (!canEdit(movie)) return { cutCount: movie.snapRefs.length, refused: 'frozen' };

      const held = new Set(movie.snapRefs.map((ref) => ref.snapId));
      const added = snapIds.filter((snapId) => {
        if (held.has(snapId)) return false;
        held.add(snapId);
        return true;
      });
      if (added.length === 0) return { cutCount: movie.snapRefs.length };
      if (movie.snapRefs.length + added.length > MovieSnapLimit) {
        return { cutCount: movie.snapRefs.length, refused: 'full' };
      }

      const snapRefs = [
        ...movie.snapRefs,
        ...added.map((snapId, index) => ({ snapId, order: movie.snapRefs.length + index })),
      ];
      updateMovieCuts(movieId, snapRefs);
      return { cutCount: snapRefs.length };
    },
    [updateMovieCuts],
  );

  /**
   * Writes the style step's settings. Returns whether the write landed, which is
   * false only for a movie a job already owns — the single reason there is, so
   * the caller needs no refusal code to tell the user why.
   */
  const saveStyle = useCallback(
    (movieId: string, patch: MovieStylePatch): boolean => {
      const movie = getMovieById(movieId);
      if (!movie || !canEdit(movie)) return false;
      updateMovieStyle(movieId, patch);
      return true;
    },
    [updateMovieStyle],
  );

  /**
   * Hands a movie to a generation job. From here on its cuts and settings are
   * fixed and `MovieGenerationGate` carries it to a render.
   *
   * A movie with nothing to generate is refused rather than started: a job over
   * an empty cut list can only produce an empty movie, and the editor would have
   * no way to explain the result.
   */
  const startGeneration = useCallback(
    (movieId: string): GenerationOutcome => {
      const movie = getMovieById(movieId);
      if (!movie) return { started: false, refused: 'frozen' };
      if (!canEdit(movie)) return { started: false, refused: 'frozen' };
      if (movie.snapRefs.length === 0) return { started: false, refused: 'empty' };

      beginMovieJob(movieId);
      return { started: true };
    },
    [beginMovieJob],
  );

  return { startMovieFromTray, saveCuts, appendSnaps, saveStyle, startGeneration };
}
