import { useEffect, useMemo } from 'react';

import {
  cutsDurationSec,
  movieJobProgressAt,
  useAdvanceMovieJob,
  useFailMovieJob,
  useFinishMovieJob,
  useMovies,
  type Movie,
} from '@/entities/movie';
import { useSnapIndex, useSnapsHydrated } from '@/entities/snap';

import { announceJobEnd } from '../lib/announce-job-end';

/**
 * Never schedule a wake-up closer than this. A boundary is always in the future
 * — `movieJobProgressAt` reports the step the clock is already past — but float
 * arithmetic can land a millisecond short, and a zero-delay timer that re-arms
 * itself is a busy loop.
 */
const MinDelayMs = 16;

/**
 * The one way a job fails today.
 *
 * There is no remote work to break, so this is not a simulated failure: the
 * user really can delete the last original a running job was built from, and a
 * job with nothing left to render cannot succeed. Real backend errors join it
 * here once `POST /movies` exists.
 */
const LostMaterialError = '이 무비가 쓰던 스냅 원본이 모두 지워져서 만들 수 없었어요.';

export type GenerationRunnerOptions = {
  /** Whether a job ending should raise a notification. Off unless asked for. */
  announce?: boolean;
};

/**
 * Carries every generation job in flight to its render.
 *
 * Mounted once for the whole app (`MovieGenerationGate`), not by the editor,
 * because a job has to keep going after the user leaves the screen — which is
 * exactly what they are told will happen (concept §6 step ③).
 *
 * There is no real compositing behind this. The simulation is a clock: a job's
 * start time is on the movie, `movieJobProgressAt` says which step that time has
 * reached, and this hook writes that step and schedules the next look. Nothing is
 * counted up, so a job survives being suspended, killed, and reopened — on the
 * next mount the elapsed time is simply already there, and a job whose whole
 * duration passed while the app was closed finishes on the first tick. When
 * `POST /movies` exists, this becomes polling or a push handler and the store
 * writes stay the same.
 *
 * A job can also end in failure — see {@link LostMaterialError}.
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

  // Only jobs in flight matter, and the identity of that list is what re-arms
  // the timer below — so it must not change when an unrelated movie is edited.
  const running = useMemo(
    () => movies.filter((movie) => movie.status === 'generating' && movie.job !== undefined),
    [movies],
  );

  useEffect(() => {
    if (running.length === 0) return;
    // Nothing may be judged against an empty library. Before the snap store
    // rehydrates, every cut looks deleted, and the material check below would
    // fail every job in flight on the first tick of an app start.
    if (!snapsHydrated) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    /**
     * How long the finished movie runs. Measured when the job completes rather
     * than when it started, because a cut's original can be deleted mid-job and a
     * render must not claim a length no cut can play.
     */
    const renderDurationSec = (movie: Movie) =>
      cutsDurationSec(movie.snapRefs, (snapId) => snapIndex.get(snapId)?.durationSec);

    const check = () => {
      const now = Date.now();
      let nextLookAt = Number.POSITIVE_INFINITY;

      for (const movie of running) {
        const job = movie.job;
        if (!job) continue;

        // Checked on every look rather than only at the end: a job that lost its
        // last original can no longer produce anything, and making the user wait
        // out the remaining steps for that answer would be a pointless wait.
        const durationSec = renderDurationSec(movie);
        if (durationSec <= 0) {
          failMovieJob(movie.id, LostMaterialError);
          if (announce) announceJobEnd('failed', movie, LostMaterialError);
          continue;
        }

        const progress = movieJobProgressAt(job.startedAt, now);
        if (progress.isDone) {
          finishMovieJob(movie.id, { renderedAt: now, durationSec });
          // Announced from here rather than from a store subscription because
          // this is the moment the job ended, and the user is expected to be
          // elsewhere by now — that is the whole reason to tell them.
          if (announce) announceJobEnd('ready', movie);
          continue;
        }

        advanceMovieJob(movie.id, progress.stepIndex);
        if (progress.nextStepAt !== undefined) {
          nextLookAt = Math.min(nextLookAt, progress.nextStepAt);
        }
      }

      if (nextLookAt !== Number.POSITIVE_INFINITY) {
        timer = setTimeout(check, Math.max(nextLookAt - Date.now(), MinDelayMs));
      }
    };

    // Scheduled rather than called: the first check writes to the store, and
    // doing that synchronously inside the effect would make mounting the gate a
    // render-time store write.
    timer = setTimeout(check, 0);
    return () => clearTimeout(timer);
  }, [running, snapIndex, snapsHydrated, announce, advanceMovieJob, finishMovieJob, failMovieJob]);
}
