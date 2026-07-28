import { useMemo } from 'react';

import type { Clip } from './clip';
import { useClips } from './clip-store';

/**
 * A reference to a clip, as a roll's membership and a developed reel both store
 * it.
 *
 * Declared structurally rather than imported from `entities/roll`: the shape is
 * the entire contract, and describing it here is what keeps the two entities
 * independent as the layer rules require — no cross-import, no `@x`. Any
 * `{ clipId, order }` satisfies it.
 */
type ClipRefLike = { clipId: string; order: number };

/** Clips keyed by id, so many rolls' references resolve in a single pass. */
export type ClipIndex = ReadonlyMap<string, Clip>;

/** Stable empty result, so an empty roll does not re-render its consumers. */
const NoClips: Clip[] = [];

function indexClipsById(clips: readonly Clip[]): ClipIndex {
  return new Map(clips.map((clip) => [clip.id, clip]));
}

/**
 * Resolves clip references to the clips they point at, ordered by each
 * reference's `order`.
 *
 * A reference whose clip is gone from the archive is skipped. That is the part
 * worth keeping in one place: deleting an original leaves every roll that
 * pointed at it holding a reference to nothing, and the roll's contact sheet,
 * the home strip, the cabinet cover, and the reel player all have to agree about
 * what that roll now holds. Each of them used to re-implement this.
 *
 * `order` is only ever a sort key, so gaps and duplicates in it are harmless.
 */
export function clipsByRefs(refs: readonly ClipRefLike[] | undefined, index: ClipIndex): Clip[] {
  if (!refs || refs.length === 0) return NoClips;
  return [...refs]
    .sort((left, right) => left.order - right.order)
    .map((ref) => index.get(ref.clipId))
    .filter((clip): clip is Clip => clip !== undefined);
}

/**
 * Reactive index of the whole archive. For a consumer resolving several rolls at
 * once — the cabinet summarizes every roll it shelves — so the archive is walked
 * once rather than once per roll.
 */
export function useClipIndex(): ClipIndex {
  const clips = useClips();
  return useMemo(() => indexClipsById(clips), [clips]);
}

/**
 * Reactive `clipsByRefs` for a single roll or reel. Pass `roll?.clipRefs` for
 * what a roll currently holds, or `roll?.reel?.clipRefs` for the developed
 * order.
 */
export function useClipsByRefs(refs: readonly ClipRefLike[] | undefined): Clip[] {
  const index = useClipIndex();
  return useMemo(() => clipsByRefs(refs, index), [refs, index]);
}
