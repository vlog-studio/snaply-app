import { useMemo } from 'react';

import { useClips } from '@/entities/clip';
import { useRolls, type Reel, type Roll } from '@/entities/roll';

export type DevelopedRollSummary = {
  id: string;
  title: string;
  dayKey?: string;
  clipCount: number;
  /** Total reel length in seconds, summed from the referenced clips. */
  totalSec: number;
};

type DevelopedRoll = Roll & { reel: Reel };

/**
 * The developed-rolls shelf read model: developed rolls, newest-developed
 * first, summarized for cover display. Cross-entity composition (rolls + clip
 * durations) reused by both the archive shelf grid and the home shelf preview,
 * so it lives in a widget rather than in either page (FSD: entities must not
 * import one another for runtime data, and pages must not import pages). A roll
 * counts as developed only once it has both the `developed` status and a
 * persisted reel.
 */
export function useDevelopedRolls(): DevelopedRollSummary[] {
  const rolls = useRolls();
  const clips = useClips();

  return useMemo(() => {
    const durationById = new Map(clips.map((clip) => [clip.id, clip.durationSec]));
    return rolls
      .filter((roll): roll is DevelopedRoll => roll.status === 'developed' && roll.reel !== undefined)
      .sort((left, right) => right.reel.developedAt - left.reel.developedAt)
      .map((roll) => ({
        id: roll.id,
        title: roll.title,
        dayKey: roll.dayKey,
        clipCount: roll.reel.clipRefs.length,
        totalSec: roll.reel.clipRefs.reduce(
          (sum, ref) => sum + (durationById.get(ref.clipId) ?? 0),
          0,
        ),
      }));
  }, [rolls, clips]);
}

/** Formats a reel length in seconds as `m:ss` for a cover's edge print. */
export function formatReelLength(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
