import { useCallback } from 'react';

import {
  getRollById,
  useAddClipToRoll,
  useCreateManualRoll,
  useRemoveClipFromRoll,
} from '@/entities/roll';

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

/** The roll a bundle produced, for the confirmation that names it. */
export type BundleOutcome = {
  rollId: string;
  /** The name the roll ended up with — the given one, or the day's default. */
  title: string;
  /** How many cuts went in. */
  changed: number;
};

const NoChange: CollectOutcome = { changed: 0, frozen: false };
const Frozen: CollectOutcome = { changed: 0, frozen: true };

/**
 * Bundling cuts into a new roll, putting them into an existing one, and taking
 * them back out.
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
  const createManualRoll = useCreateManualRoll();
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

  /**
   * Makes a roll out of the given cuts and puts them in it.
   *
   * A new roll can never be refused the way an existing one can: it is created
   * undeveloped a moment before the cuts go in, so the outcome only says which
   * roll appeared and how many cuts it holds. Bundling nothing makes nothing —
   * an empty roll would be a dead end, and the store retires those anyway.
   *
   * The name is optional; the entity decides what a blank one becomes.
   */
  const bundleIntoNewRoll = useCallback(
    (title: string | undefined, clipIds: readonly string[]): BundleOutcome | undefined => {
      if (clipIds.length === 0) return undefined;
      const roll = createManualRoll({ title });
      const outcome = addClipsToRoll(roll.id, clipIds);
      return { rollId: roll.id, title: roll.title, changed: outcome.changed };
    },
    [createManualRoll, addClipsToRoll],
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
      // Taking the last cut out of a hand-made roll retires the roll — the
      // store enforces that, since deleting originals can empty one just as
      // easily as this can. A daily roll survives holding nothing.
      return { changed, frozen: false };
    },
    [removeClipFromRoll],
  );

  return { bundleIntoNewRoll, addClipsToRoll, removeClipsFromRoll };
}
