import { useCallback } from 'react';

import {
  MovieSnapLimit,
  getMovieById,
  isAiArranged,
  sameArrangement,
  useBeginMovieJob,
  useCreateMovie,
  useSetMovieArranger,
  useUpdateMovieCuts,
  useUpdateMovieStyle,
  type Movie,
  type MovieArranger,
  type MovieStylePatch,
  type SnapRef,
} from '@/entities/movie';
import { getSnapSyncEntries, useSnapIndex } from '@/entities/snap';
import { useClearTray, useTraySnapIds } from '@/entities/tray';
import { ApiError } from '@/shared/api';

import { createEditJob } from '../api/create-edit-job';

/**
 * Why a cut edit was refused, or `undefined` when it landed.
 *
 * `frozen` — a job owns the movie right now (see {@link canEditMovie}).
 * `empty` — a movie must keep at least one cut; deleting the movie is offered for
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
 * `frozen` — a job already owns the movie; a finished movie may always be made
 * again, so this is the only state that refuses outright.
 * `empty` — there is nothing to generate from.
 * `uploading` — some cuts have not reached the backend yet. The run is made from
 * the *server's* copies of the snaps, and `POST /edit-jobs` refuses a batch whole
 * when one of them is missing, so this is checked here rather than discovered as
 * a `403` after the user has pressed the button.
 * `rejected` — the backend refused the run: not the caller's video, a video that
 * is not ready, or the free plan's monthly cap. It carries the server's own
 * message, because a `403` does not say which of those it was.
 * `unreachable` — the request itself failed. Nothing was queued and the movie is
 * left exactly as it was, so pressing again is the whole recovery.
 */
export type GenerationRefusal = 'frozen' | 'empty' | 'uploading' | 'rejected' | 'unreachable';

export type GenerationOutcome = {
  started: boolean;
  refused?: GenerationRefusal;
  /**
   * What the backend said, for the refusals only it can explain (`rejected`).
   * Shown as-is: the server distinguishes an ownership problem from a plan limit
   * in the message and nowhere else.
   */
  message?: string;
};

/**
 * A movie's cuts and settings may be edited whenever a job does not own it.
 *
 * `draft` is editable on purpose: generation is remote, slow work once a real
 * backend runs it, so the draft is where the user settles the order, the cut
 * lengths, and the style **before** paying for a run — and fixing what a run
 * produced (`ready`, `failed`) is the same act on the same screen. Only
 * `generating` freezes the movie, because editing under a job would make the
 * result describe a cut list that no longer exists.
 */
export function canEditMovie(movie: Movie): boolean {
  return movie.status !== 'generating';
}

/**
 * A movie may be generated whenever a job is not already running on it.
 *
 * `ready` is included on purpose: running a finished movie again *is*
 * regeneration, and it is the same act with the same rules, so it is not a
 * second code path. `beginMovieJob` drops the previous render and error, so the
 * old result never outlives the movie that replaced it.
 */
function canGenerate(movie: Movie): boolean {
  return movie.status !== 'generating';
}

/**
 * Puts an AI-arranged cut list back into the order the snaps were shot in, or
 * answers `undefined` when it is already in it.
 *
 * **This is the whole of "AI가 순서를 짠다" today.** Chronological is a real
 * arrangement rather than a placeholder — it is the order a walk happened in,
 * and it is what template matching produces in the first place — but it is not
 * a model looking at pictures, and no part of the app claims otherwise. It
 * becomes visible when the user appends a snap to an AI-arranged movie: the new
 * cut drops into its place in the day instead of sitting at the end. A cut whose
 * original is gone keeps its position, because there is no time to sort it by
 * and dropping it here would delete material behind the user's back.
 */
function arrangeByCaptureTime(
  snapRefs: readonly SnapRef[],
  snapIndex: ReadonlyMap<string, { capturedAt: number }>,
): SnapRef[] | undefined {
  const stored = [...snapRefs].sort((left, right) => left.order - right.order);
  const capturedAt = (ref: SnapRef) => snapIndex.get(ref.snapId)?.capturedAt;
  if (stored.some((ref) => capturedAt(ref) === undefined)) return undefined;

  const arranged = stored
    .map((ref, position) => ({ ref, position }))
    .sort(
      (left, right) =>
        capturedAt(left.ref)! - capturedAt(right.ref)! || left.position - right.position,
    )
    .map(({ ref }, order) => ({ ...ref, order }));

  const unchanged = arranged.every((ref, index) => ref.snapId === stored[index].snapId);
  return unchanged ? undefined : arranged;
}

/**
 * The cuts' ids on the server, in cut order — or `undefined` when one of them has
 * not got there yet.
 *
 * The mapping lives on `entities/snap`'s sync store, which is where the upload
 * worker writes the id each snap earned. Read at call time rather than
 * subscribed to: this answers "can this run start *now*", and a stale answer
 * would either refuse a movie that just finished uploading or send an id that
 * does not exist yet.
 *
 * All-or-nothing on purpose. `POST /edit-jobs` refuses the whole batch when one
 * source is missing, and half a movie is not a movie the user asked for.
 */
function remoteVideoIds(snapRefs: readonly SnapRef[]): string[] | undefined {
  const entries = getSnapSyncEntries();
  const ordered = [...snapRefs].sort((left, right) => left.order - right.order);
  const videoIds: string[] = [];
  for (const ref of ordered) {
    const entry = entries[ref.snapId];
    if (entry?.status !== 'uploaded') return undefined;
    videoIds.push(entry.videoId);
  }
  return videoIds;
}

/**
 * Turning picked material into a movie, running it, and fixing what comes back.
 *
 * It spans the tray and the movie — starting a movie empties the tray — which is
 * what makes it a feature rather than page code. Concentrating it here also
 * concentrates the rules that guard it: at least one cut, at most
 * {@link MovieSnapLimit}, no edits while a job owns the movie, and no
 * generation while one is already running. Enforcing those only in the UI would
 * leave each one a forgotten `disabled` prop away from being bypassed.
 *
 * The movie is read at call time rather than subscribed to: these run from event
 * handlers, and the current movie is what the write must be checked against.
 */
export function useComposeMovie() {
  const traySnapIds = useTraySnapIds();
  const clearTray = useClearTray();
  // Only for arranging an AI-arranged movie by capture time; nothing else here
  // needs a snap, and movies themselves never hold one.
  const snapIndex = useSnapIndex();
  const createMovie = useCreateMovie();
  const updateMovieCuts = useUpdateMovieCuts();
  const updateMovieStyle = useUpdateMovieStyle();
  const setMovieArranger = useSetMovieArranger();
  const beginMovieJob = useBeginMovieJob();

  /**
   * Starts a draft from everything in the tray and empties the tray, returning
   * the movie so the caller can open it. An empty tray makes nothing — a movie
   * with no cuts is a dead end.
   *
   * The tray's order is the user's, so the movie it makes is `user`-arranged and
   * nothing may re-sort it.
   */
  const startMovieFromTray = useCallback((): Movie | undefined => {
    if (traySnapIds.length === 0) return undefined;
    const movie = createMovie({ snapIds: traySnapIds, arranger: 'user' });
    clearTray();
    return movie;
  }, [traySnapIds, createMovie, clearTray]);

  /**
   * Starts a movie from a filled template, in slot order, with the look the
   * template asks for.
   *
   * The tray is untouched: material gathered by hand and material found by
   * matching are two separate ways to start a movie, and finishing one should
   * not empty the other. The movie is `ai`-arranged, which is what lets a later
   * generation re-sort it — until the user rearranges it themselves.
   */
  const startMovieFromTemplate = useCallback(
    (input: { snapIds: readonly string[]; title?: string; style: Movie['style']; bgm: string }) => {
      if (input.snapIds.length === 0) return undefined;
      return createMovie({ ...input, arranger: 'ai' });
    },
    [createMovie],
  );

  /**
   * Commits the working cut list. Order is rewritten to the list's own order, so
   * a caller never has to renumber; the trim it carries is kept.
   *
   * A commit that moves the cuts of an AI-arranged movie hands the order to the
   * user in the same write. That is the whole of "순서 고정": the user does not
   * have to find a switch first, and a later re-match cannot undo what they just
   * did. Trimming alone is not rearranging, so it costs nothing.
   */
  const saveCuts = useCallback(
    (movieId: string, snapRefs: readonly SnapRef[]): CutsOutcome => {
      const movie = getMovieById(movieId);
      if (!movie) return { cutCount: 0, refused: 'frozen' };
      if (!canEditMovie(movie)) return { cutCount: movie.snapRefs.length, refused: 'frozen' };
      if (snapRefs.length === 0) return { cutCount: movie.snapRefs.length, refused: 'empty' };
      if (snapRefs.length > MovieSnapLimit) {
        return { cutCount: movie.snapRefs.length, refused: 'full' };
      }

      const stored = [...movie.snapRefs].sort((left, right) => left.order - right.order);
      const renumbered = snapRefs.map((ref, order) => ({ ...ref, order }));
      updateMovieCuts(movieId, renumbered);
      if (isAiArranged(movie) && !sameArrangement(stored, renumbered)) {
        setMovieArranger(movieId, 'user');
      }
      return { cutCount: renumbered.length };
    },
    [updateMovieCuts, setMovieArranger],
  );

  /**
   * Hands the cut order back to the AI, or takes it. The only way into `ai`
   * after creation — everything else can hand it to the user but never away.
   */
  const setArranger = useCallback(
    (movieId: string, arranger: MovieArranger): boolean => {
      const movie = getMovieById(movieId);
      if (!movie || !canEditMovie(movie)) return false;
      setMovieArranger(movieId, arranger);
      return true;
    },
    [setMovieArranger],
  );

  /**
   * Appends snaps to the end of a movie's cut list — the movie screen's "스냅 더
   * 넣기", so a movie that came back short can be filled out and run again.
   * Snaps the movie already holds are skipped rather than duplicated, and the
   * whole batch is refused if it would not fit, so the user is never left
   * guessing which half went in.
   */
  const appendSnaps = useCallback(
    (movieId: string, snapIds: readonly string[]): CutsOutcome => {
      const movie = getMovieById(movieId);
      if (!movie) return { cutCount: 0, refused: 'frozen' };
      if (!canEditMovie(movie)) return { cutCount: movie.snapRefs.length, refused: 'frozen' };

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
   * Writes the style settings. Returns whether the write landed, which is false
   * only while a job owns the movie — the single reason there is, so the caller
   * needs no refusal code to tell the user why.
   */
  const saveStyle = useCallback(
    (movieId: string, patch: MovieStylePatch): boolean => {
      const movie = getMovieById(movieId);
      if (!movie || !canEditMovie(movie)) return false;
      updateMovieStyle(movieId, patch);
      return true;
    },
    [updateMovieStyle],
  );

  /**
   * Hands a movie to a generation job, whether that is its first run, a retry
   * after a failure, or a regeneration of a movie the user has already watched
   * and changed. `MovieGenerationGate` follows it to a render from there.
   *
   * The run is queued on the backend first and the movie enters `generating` only
   * once there is a `jobId` to follow (2026-08-07): the socket and the status
   * endpoint are both addressed by that id, so a movie that went `generating`
   * before the request landed would be a job nothing could report on — and a
   * refusal would have to be undone rather than simply reported.
   *
   * A movie with nothing to generate is refused rather than started: a job over
   * an empty cut list can only produce an empty movie, and the screen would have
   * no way to explain the result. So is a movie whose cuts are still uploading —
   * the run is made from the server's copies.
   */
  const startGeneration = useCallback(
    async (movieId: string): Promise<GenerationOutcome> => {
      const movie = getMovieById(movieId);
      if (!movie) return { started: false, refused: 'frozen' };
      if (!canGenerate(movie)) return { started: false, refused: 'frozen' };
      if (movie.snapRefs.length === 0) return { started: false, refused: 'empty' };

      // A movie the AI still arranges gets arranged before it runs, so what the
      // user sees afterwards is what was made. A movie the user arranged is left
      // exactly as they left it — that is the whole promise of the lock. Done
      // before the ids are collected, because the arrangement *is* the order the
      // request carries.
      let snapRefs = movie.snapRefs;
      if (isAiArranged(movie)) {
        const arranged = arrangeByCaptureTime(snapRefs, snapIndex);
        if (arranged) {
          updateMovieCuts(movieId, arranged);
          snapRefs = arranged;
        }
      }

      const videoIds = remoteVideoIds(snapRefs);
      if (!videoIds) return { started: false, refused: 'uploading' };

      let jobId: string;
      try {
        jobId = await createEditJob({ videoIds, style: movie.style });
      } catch (error) {
        // A refusal the backend can explain is reported in its own words; a
        // transport failure is not the user's to interpret.
        if (error instanceof ApiError && error.status === 403) {
          return { started: false, refused: 'rejected', message: error.message };
        }
        if (__DEV__) console.warn(`[compose-movie] could not queue ${movieId}:`, String(error));
        return { started: false, refused: 'unreachable' };
      }

      // The movie may have been deleted, or taken by another run, while the
      // request was in flight. `beginMovieJob` lands on nothing in that case,
      // which leaves the queued run to finish unwatched on the server — better
      // than resurrecting a movie the user has since removed.
      beginMovieJob(movieId, jobId);
      return { started: true };
    },
    [beginMovieJob, updateMovieCuts, snapIndex],
  );

  return {
    startMovieFromTray,
    startMovieFromTemplate,
    saveCuts,
    appendSnaps,
    saveStyle,
    setArranger,
    startGeneration,
  };
}
