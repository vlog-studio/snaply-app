import { useMemo } from 'react';

import { useClips, type Clip } from '@/entities/clip';
import { useRollById, type Roll } from '@/entities/roll';

export type RollDetail = {
  roll: Roll | undefined;
  /** The roll's clips, resolved and ordered by each reference's `order`. */
  clips: Clip[];
  /** Whether the roll can be developed (has at least one clip). */
  canDevelop: boolean;
};

/**
 * Joins a roll to its referenced clips for the roll-detail screen. This is
 * cross-entity composition (roll references + clip archive), which belongs at
 * the page layer — neither entity imports the other. Missing clips (a reference
 * whose clip was deleted from the archive) are skipped.
 */
export function useRollDetail(rollId: string | undefined): RollDetail {
  const roll = useRollById(rollId);
  const clips = useClips();

  const orderedClips = useMemo(() => {
    if (!roll) return [];
    const byId = new Map(clips.map((clip) => [clip.id, clip]));
    return [...roll.clipRefs]
      .sort((left, right) => left.order - right.order)
      .map((ref) => byId.get(ref.clipId))
      .filter((clip): clip is Clip => clip !== undefined);
  }, [roll, clips]);

  return { roll, clips: orderedClips, canDevelop: orderedClips.length > 0 };
}
