import { useMemo } from 'react';

import { useClips, type Clip } from '@/entities/clip';
import type { Roll } from '@/entities/roll';

/**
 * The archive clips that can still be added to the roll — every clip not
 * already referenced by it, newest first. Like `useRollDetail`, this is
 * cross-entity composition (roll references × clip archive) and therefore
 * lives at the page layer.
 */
export function useAddableClips(roll: Roll | undefined): Clip[] {
  const clips = useClips();

  return useMemo(() => {
    if (!roll) return [];
    const inRoll = new Set(roll.clipRefs.map((ref) => ref.clipId));
    return clips
      .filter((clip) => !inRoll.has(clip.id))
      .sort((left, right) => right.capturedAt - left.capturedAt);
  }, [roll, clips]);
}
