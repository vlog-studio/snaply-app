import { useMemo } from 'react';

import { useClips } from '@/entities/clip';
import { useRollById, type Reel, type Roll } from '@/entities/roll';

export type ReelView = {
  roll: Roll | undefined;
  reel: Reel | undefined;
  /** Source URIs of the developed reel's clips, in reel order. */
  uris: string[];
};

/**
 * Resolves a developed roll's reel into an ordered list of clip source URIs for
 * the sequential reel player. Reads from the reel's own clip references (the
 * developed order), joining to the clip archive for URIs — cross-entity
 * composition that belongs at the page layer. Missing clips are skipped.
 */
export function useReel(rollId: string | undefined): ReelView {
  const roll = useRollById(rollId);
  const clips = useClips();
  const reel = roll?.reel;

  const uris = useMemo(() => {
    if (!reel) return [];
    const byId = new Map(clips.map((clip) => [clip.id, clip]));
    return [...reel.clipRefs]
      .sort((left, right) => left.order - right.order)
      .map((ref) => byId.get(ref.clipId)?.uri)
      .filter((uri): uri is string => uri !== undefined);
  }, [reel, clips]);

  return { roll, reel, uris };
}
