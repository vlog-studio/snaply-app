import { useClipsByRefs, type Clip } from '@/entities/clip';
import { formatDayRange, toDayKey, useRollById, type Roll } from '@/entities/roll';

export type RollDetail = {
  roll: Roll | undefined;
  /** The roll's clips, resolved and ordered by each reference's `order`. */
  clips: Clip[];
  /** Whether the roll can be developed (has at least one clip). */
  canDevelop: boolean;
  /**
   * What the header's edge print stamps for the date: a daily roll's own day,
   * or the span a hand-made roll's cuts cover. Undefined only when neither is
   * answerable — a roll bundled by hand whose cuts are all gone.
   */
  dateLabel: string | undefined;
};

/**
 * Joins a roll to its referenced clips for the roll-detail screen, then derives
 * the header's date stamp. The join itself — ordering, and skipping a reference
 * whose clip was deleted — is `useClipsByRefs`, so every surface that draws a
 * roll resolves it the same way.
 */
export function useRollDetail(rollId: string | undefined): RollDetail {
  const roll = useRollById(rollId);
  const orderedClips = useClipsByRefs(roll?.clipRefs);

  // A daily roll is its date, so it stamps that. A roll bundled by hand is a
  // name instead, and the edge is where its dates go — without this it stamped
  // a bare "—", which said nothing about a roll that does have dates.
  const dateLabel =
    roll?.dayKey ?? formatDayRange(orderedClips.map((clip) => toDayKey(clip.capturedAt)));

  return { roll, clips: orderedClips, canDevelop: orderedClips.length > 0, dateLabel };
}
