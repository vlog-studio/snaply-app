import { useEffect, useState } from 'react';

/** Twice a second: fine enough that a forty-second arc never looks stuck. */
const TickMs = 500;

/**
 * A clock that ticks while `active`, for a screen that draws a job's progress.
 *
 * The store holds which step a job has reached and nothing finer, on purpose — a
 * movie card in a list must not re-render on a timer. The generation screen is the
 * one place a user actually watches the number climb, so it reads the same job
 * clock the runner does and keeps the ticking local to itself.
 */
export function useJobClock(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), TickMs);
    return () => clearInterval(timer);
  }, [active]);

  return now;
}
