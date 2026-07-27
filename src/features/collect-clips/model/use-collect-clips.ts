import { useCallback } from 'react';

import { getRollById, useAddClipToRoll, useRemoveClipFromRoll } from '@/entities/roll';

/** What a collect action actually did, so a caller can report it honestly. */
export type CollectOutcome = {
  /** How many of the given cuts the roll gained, or lost. */
  changed: number;
  /**
   * True when the roll refused the change because its reel is already
   * developed. A frozen roll never partially changes — `changed` is 0.
   */
  frozen: boolean;
};

const NoChange: CollectOutcome = { changed: 0, frozen: false };
const Frozen: CollectOutcome = { changed: 0, frozen: true };

/**
 * Putting cuts into a roll and taking them back out.
 *
 * Membership is the one thing a cut and a roll share, and both screens that
 * show it — the contact strip and roll detail — need to change it, which is
 * what makes this a feature rather than page code. Concentrating it here also
 * concentrates the rule that guards it: a developed roll's reel is a finished
 * artifact, so its membership is frozen. Enforcing that only in the UI would
 * leave the rule one forgotten disabled prop away from being bypassed.
 *
 * Neither action touches the original. Taking a cut out of a roll drops a
 * reference and leaves the cut in the archive; erasing the original is
 * `features/delete-clip`, which cascades through every roll.
 *
 * The roll is read at call time rather than subscribed to: these run from an
 * event handler, and the current roll is what the write must be checked
 * against.
 */
export function useCollectClips() {
  const addClipToRoll = useAddClipToRoll();
  const removeClipFromRoll = useRemoveClipFromRoll();

  const addClipsToRoll = useCallback(
    (rollId: string, clipIds: readonly string[]): CollectOutcome => {
      const roll = getRollById(rollId);
      if (!roll) return NoChange;
      if (roll.status !== 'undeveloped') return Frozen;

      // The store already ignores a duplicate reference; this set is what makes
      // the reported count the number of cuts that actually entered the roll,
      // including when the same cut appears twice in one batch.
      const held = new Set(roll.clipRefs.map((ref) => ref.clipId));
      let changed = 0;
      for (const clipId of clipIds) {
        if (held.has(clipId)) continue;
        held.add(clipId);
        addClipToRoll(rollId, clipId);
        changed += 1;
      }
      return { changed, frozen: false };
    },
    [addClipToRoll],
  );

  const removeClipsFromRoll = useCallback(
    (rollId: string, clipIds: readonly string[]): CollectOutcome => {
      const roll = getRollById(rollId);
      if (!roll) return NoChange;
      if (roll.status !== 'undeveloped') return Frozen;

      const held = new Set(roll.clipRefs.map((ref) => ref.clipId));
      let changed = 0;
      for (const clipId of clipIds) {
        if (!held.has(clipId)) continue;
        held.delete(clipId);
        removeClipFromRoll(rollId, clipId);
        changed += 1;
      }
      // Emptying a manually made roll should retire it, but a roll cannot be
      // made by hand yet, and a daily roll survives holding nothing (it is the
      // invitation to capture). The cleanup lands with 새 롤로 묶기.
      return { changed, frozen: false };
    },
    [removeClipFromRoll],
  );

  return { addClipsToRoll, removeClipsFromRoll };
}
