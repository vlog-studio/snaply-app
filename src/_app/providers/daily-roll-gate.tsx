import { useEffect } from 'react';

import { ensureDailyRoll, useRollsHydrated } from '@/entities/roll';

/**
 * Headless app-entry trigger for today's daily roll. Waits for the persisted
 * rolls to hydrate (so it never creates a duplicate before the stored roll loads,
 * and it can restore the "today's roll" pointer), then ensures today's roll
 * exists. This is the app-boot trigger from mvp-implementation-plan.md §8;
 * `capture-moment` also calls `ensureDailyRoll`, which covers a midnight rollover
 * during a long-running session.
 */
export function DailyRollGate(): null {
  const hydrated = useRollsHydrated();

  useEffect(() => {
    if (hydrated) ensureDailyRoll();
  }, [hydrated]);

  return null;
}
