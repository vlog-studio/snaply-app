/**
 * The five steps a generation job reports, in order (concept §6 step ③). Shown
 * as a checklist so a forty-second wait reads as work rather than a hang.
 */
export const MovieGenerationSteps = [
  '업로드',
  '장면 분석',
  '컷 다듬기',
  '음악·자막',
  '렌더',
] as const;

export type MovieGenerationStep = (typeof MovieGenerationSteps)[number];

export const MovieGenerationStepCount = MovieGenerationSteps.length;

/**
 * How long each step takes.
 *
 * **This is the simulation's timing, not a measurement.** No compositing happens
 * locally, so a job's only real property is when it started; the steps are paced
 * by these durations to about the forty seconds a server-side render is expected
 * to take. When `POST /movies` exists, progress arrives from polling or a push
 * and this table goes away — nothing outside this module knows the numbers.
 */
const StepDurationsMs = [3_000, 9_000, 8_000, 8_000, 12_000] as const;

/** Wall-clock length of a whole job. */
export const MovieGenerationTotalMs = StepDurationsMs.reduce((total, step) => total + step, 0);

export type MovieJobProgress = {
  /** The step running now, held at the last one once the job is done. */
  stepIndex: number;
  /** How far the whole job has come, 0–1. */
  ratio: number;
  isDone: boolean;
  /** Epoch ms the next step begins; absent once the job is done. */
  nextStepAt?: number;
};

/**
 * Where a job stands, derived from when it started and what time it is now.
 *
 * Progress is computed from the clock rather than counted up by a timer, which is
 * what lets a job survive the app being backgrounded, killed, and reopened: the
 * runner only has to look again, and a step boundary missed while suspended is
 * simply already behind. A clock that moved backwards reads as no progress rather
 * than negative progress.
 */
export function movieJobProgressAt(startedAt: number, now: number): MovieJobProgress {
  const elapsed = Math.max(now - startedAt, 0);
  const done = { stepIndex: MovieGenerationStepCount - 1, ratio: 1, isDone: true };
  if (elapsed >= MovieGenerationTotalMs) return done;

  let consumed = 0;
  for (let index = 0; index < StepDurationsMs.length; index += 1) {
    consumed += StepDurationsMs[index];
    if (elapsed < consumed) {
      return {
        stepIndex: index,
        ratio: elapsed / MovieGenerationTotalMs,
        isDone: false,
        nextStepAt: startedAt + consumed,
      };
    }
  }

  // Unreachable: the total above is the last boundary, and elapsed is below it.
  return done;
}
