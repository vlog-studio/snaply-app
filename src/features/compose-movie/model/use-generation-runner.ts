import { useEffect, useMemo } from 'react';

import {
  cutsDurationSec,
  movieJobProgressAt,
  useAdvanceMovieJob,
  useFinishMovieJob,
  useMovies,
  type Movie,
} from '@/entities/movie';
import { useSnapIndex } from '@/entities/snap';

/**
 * Never schedule a wake-up closer than this. A boundary is always in the future
 * — `movieJobProgressAt` reports the step the clock is already past — but float
 * arithmetic can land a millisecond short, and a zero-delay timer that re-arms
 * itself is a busy loop.
 */
const MinDelayMs = 16;

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
 */
export function useGenerationRunner(): void {
  const movies = useMovies();
  const snapIndex = useSnapIndex();
  const advanceMovieJob = useAdvanceMovieJob();
  const finishMovieJob = useFinishMovieJob();

  // Only jobs in flight matter, and the identity of that list is what re-arms
  // the timer below — so it must not change when an unrelated movie is edited.
  const running = useMemo(
    () => movies.filter((movie) => movie.status === 'generating' && movie.job !== undefined),
    [movies],
  );

  useEffect(() => {
    if (running.length === 0) return;

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

        const progress = movieJobProgressAt(job.startedAt, now);
        if (progress.isDone) {
          finishMovieJob(movie.id, { renderedAt: now, durationSec: renderDurationSec(movie) });
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
  }, [running, snapIndex, advanceMovieJob, finishMovieJob]);
}
