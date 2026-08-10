import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';

import {
  cutsDurationSec,
  useAdvanceMovieJob,
  useFailMovieJob,
  useFinishMovieJob,
  useMovies,
  type Movie,
} from '@/entities/movie';
import { useSnapIndex, useSnapsHydrated } from '@/entities/snap';
import { ApiError } from '@/shared/api';

import { getEditedVideo } from '../api/get-edited-video';
import { getEditJob } from '../api/get-edit-job';
import { subscribeEditProgress } from '../api/subscribe-edit-progress';
import { announceJobEnd } from '../lib/announce-job-end';

/**
 * How often a running job is asked about over HTTP, on top of its socket.
 *
 * The socket is the live channel, but it is one TCP connection on a mobile
 * network: it can die without a close frame, and nothing would then tell the app
 * that the run went on and finished. This is the floor under that — slow enough
 * to be nearly free, fast enough that a dropped socket costs seconds rather than
 * the rest of the session.
 */
const PollIntervalMs = 20_000;

/** The user deleted the last original a running job was built from. */
const LostMaterialError = '이 무비가 쓰던 스냅 원본이 모두 지워져서 만들 수 없었어요.';

/** The backend has never heard of this job — see the stale-job note below. */
const UnknownJobError = '이 무비의 편집 작업을 서버에서 찾을 수 없어요. 다시 만들어주세요.';

/** A run that failed without saying why. */
const UnexplainedError = '만들지 못했어요. 다시 시도해주세요.';

export type GenerationRunnerOptions = {
  /** Whether a job ending should raise a notification. Off unless asked for. */
  announce?: boolean;
};

/**
 * Follows every generation job in flight to its result.
 *
 * Mounted once for the whole app (`MovieGenerationGate`), not by the movie screen,
 * because a job has to keep going after the user leaves the screen — which is
 * exactly what they are told will happen (concept §6 step ③).
 *
 * **The work is the backend's (2026-08-07).** This used to be a clock: a job's
 * start time was on the movie and a local table of step durations decided how far
 * it had come. Now `features/compose-movie` queues a real run and this hook is
 * three ways of hearing about the same one:
 *
 * - the **progress socket**, which streams the pipeline's milestones and the
 *   rendered file's URL as it completes;
 * - a **poll** every {@link PollIntervalMs}, because a mobile socket can die
 *   silently and a run must not be able to strand a movie in `generating`;
 * - a **foreground pass**, because neither of those runs while the app is away —
 *   and a job finishing while the user is elsewhere is the expected case.
 *
 * All three converge on `resolve`, which asks the backend where the run stands and
 * writes the answer once. Progress reports go straight to the store, so every
 * surface drawing this movie updates together and none of them needs a ticker.
 *
 * A job can also fail without the backend's help — see {@link LostMaterialError}.
 *
 * `announce` is the user's 무비 완성 알림 preference, passed in rather than read
 * here: the preference belongs to another feature, and features do not import
 * each other (the app layer composes them).
 */
export function useGenerationRunner({ announce = false }: GenerationRunnerOptions = {}): void {
  const movies = useMovies();
  const snapIndex = useSnapIndex();
  const snapsHydrated = useSnapsHydrated();
  const advanceMovieJob = useAdvanceMovieJob();
  const finishMovieJob = useFinishMovieJob();
  const failMovieJob = useFailMovieJob();

  // Only jobs in flight matter, and the identity of this list is what re-opens
  // the sockets below — so it must not change when an unrelated movie is edited,
  // nor when a running job merely reports progress.
  const running = useMemo(
    () =>
      movies
        .filter((movie) => movie.status === 'generating' && movie.job !== undefined)
        .map((movie) => ({ movieId: movie.id, jobId: movie.job!.id })),
    [movies],
  );
  const runningKey = running.map((job) => `${job.movieId}:${job.jobId}`).join('|');

  // The result-writing side reads these at call time, so a resolve in flight
  // always judges against the current cut list rather than the one that was on
  // screen when the socket opened. Written in an effect rather than during
  // render — the React Compiler forbids the latter, and this effect is declared
  // before the one below so the values are current before anything reads them.
  const latest = useRef({ movies, snapIndex, announce });
  useEffect(() => {
    latest.current = { movies, snapIndex, announce };
  });

  useEffect(() => {
    if (running.length === 0) return;
    // Nothing may be judged against an empty library. Before the snap store
    // rehydrates every cut looks deleted, and the material check below would
    // fail every job in flight on the first pass of an app start.
    if (!snapsHydrated) return;

    let cancelled = false;
    const settled = new Set<string>();

    const movieById = (movieId: string) =>
      latest.current.movies.find((movie) => movie.id === movieId);

    /**
     * How long the finished movie runs. Measured as the job ends rather than when
     * it started, because a cut's original can be deleted mid-job and a render
     * must not claim a length no cut can play.
     */
    const cutsSec = (movie: Movie) =>
      cutsDurationSec(movie.snapRefs, (snapId) => latest.current.snapIndex.get(snapId)?.durationSec);

    const fail = (movie: Movie, error: string) => {
      settled.add(movie.id);
      failMovieJob(movie.id, error);
      if (latest.current.announce) announceJobEnd('failed', movie, error);
    };

    const finish = (movie: Movie, uri: string | undefined, durationSec: number) => {
      settled.add(movie.id);
      finishMovieJob(movie.id, {
        ...(uri ? { uri } : null),
        renderedAt: Date.now(),
        durationSec,
      });
      // Announced from here rather than from a store subscription because this is
      // the moment the job ended, and the user is expected to be elsewhere by
      // now — that is the whole reason to tell them.
      if (latest.current.announce) announceJobEnd('ready', movie);
    };

    /**
     * Ask the backend where one run stands and write the answer, if it has one.
     *
     * Idempotent by design: the socket's completion, the poll, and the foreground
     * pass can all reach the same finished job, and `settled` plus the store's own
     * `generating` guard mean only the first one writes.
     */
    const resolve = async (movieId: string, jobId: string) => {
      if (cancelled || settled.has(movieId)) return;
      const movie = movieById(movieId);
      if (!movie || movie.status !== 'generating') return;

      // Checked before the network: a job that lost its last original can no
      // longer produce anything, and making the user wait out a remote render for
      // that answer would be a pointless wait.
      if (cutsSec(movie) <= 0) {
        fail(movie, LostMaterialError);
        return;
      }

      let state;
      try {
        state = await getEditJob(jobId);
      } catch (error) {
        // A job the backend cannot find is not coming back. This is also how a
        // movie left `generating` by a build that predates the real backend gets
        // out: its job id was local and no run ever existed for it.
        if (error instanceof ApiError && error.status === 404) {
          const stale = movieById(movieId);
          if (stale) fail(stale, UnknownJobError);
          return;
        }
        // Anything else is this device's problem, not the run's. Leave the movie
        // generating; the next poll asks again.
        if (__DEV__) console.warn(`[compose-movie] could not read ${jobId}:`, String(error));
        return;
      }
      if (cancelled || settled.has(movieId)) return;

      const current = movieById(movieId);
      if (!current || current.status !== 'generating') return;

      if (state.status === 'failed') {
        fail(current, state.errorMessage ?? UnexplainedError);
        return;
      }
      if (state.status !== 'done') {
        advanceMovieJob(movieId, state.progress);
        return;
      }

      let uri: string | undefined;
      let serverDurationSec: number | undefined;
      try {
        const video = await getEditedVideo(state.videoId);
        uri = video.editedUrl;
        serverDurationSec = video.durationSeconds;
      } catch (error) {
        // The run is done; only the file's whereabouts are unknown. Finishing
        // without it leaves a movie that plays its cuts, which is what every
        // movie did before a renderer existed — better than a movie stuck
        // generating over a lookup.
        if (__DEV__) console.warn(`[compose-movie] no result for ${jobId}:`, String(error));
      }
      if (cancelled || settled.has(movieId)) return;

      const ready = movieById(movieId);
      if (!ready || ready.status !== 'generating') return;
      // The stored length has to describe what will actually play: the rendered
      // file when there is one, the cuts when there is not.
      finish(ready, uri, uri && serverDurationSec ? serverDurationSec : cutsSec(ready));
    };

    const sockets = running.map(({ movieId, jobId }) =>
      subscribeEditProgress(jobId, {
        onEvent: (event) => {
          if (cancelled || settled.has(movieId)) return;
          if (event.kind === 'progress') {
            advanceMovieJob(movieId, event.progress, event.step);
            return;
          }
          if (event.kind === 'failed') {
            const movie = movieById(movieId);
            if (movie) fail(movie, event.error ?? UnexplainedError);
            return;
          }
          // `done` carries the file's URL, but not the thumbnail, the measured
          // length, or anything else a result is made of — and a socket that
          // reconnects to an already-finished job is answered without the URL at
          // all. So completion is confirmed the one way that always works.
          void resolve(movieId, jobId);
        },
      }),
    );

    // The catch-up pass: a job may well have finished while the app was closed.
    running.forEach(({ movieId, jobId }) => void resolve(movieId, jobId));

    const poll = setInterval(
      () => running.forEach(({ movieId, jobId }) => void resolve(movieId, jobId)),
      PollIntervalMs,
    );
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        running.forEach(({ movieId, jobId }) => void resolve(movieId, jobId));
      }
    });

    return () => {
      cancelled = true;
      sockets.forEach((socket) => socket.close());
      clearInterval(poll);
      subscription.remove();
    };
    // `runningKey` stands in for `running`: the array is rebuilt whenever any
    // movie changes, and re-opening every socket on an unrelated edit would
    // restart the subscriptions several times a run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningKey, snapsHydrated, advanceMovieJob, finishMovieJob, failMovieJob]);
}
