import { useMemo } from 'react';

import { useClipsByRefs } from '@/entities/clip';
import { useRollById, type Reel, type Roll } from '@/entities/roll';

export type ReelView = {
  roll: Roll | undefined;
  reel: Reel | undefined;
  /** Source URIs of the developed reel's clips, in reel order. */
  uris: string[];
};

/**
 * Resolves a developed roll's reel into an ordered list of clip source URIs for
 * the sequential reel player. It reads the reel's own references — the developed
 * order — rather than the roll's current membership, so the reel plays what was
 * developed even if the roll has changed since.
 */
export function useReel(rollId: string | undefined): ReelView {
  const roll = useRollById(rollId);
  const reel = roll?.reel;
  const clips = useClipsByRefs(reel?.clipRefs);

  const uris = useMemo(() => clips.map((clip) => clip.uri), [clips]);

  return { roll, reel, uris };
}
