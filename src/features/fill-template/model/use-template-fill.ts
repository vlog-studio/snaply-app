import { useCallback, useMemo, useState } from 'react';

import type { MovieTemplate, TemplateSlot } from '@/entities/movie-template';
import { useSnaps, type Snap } from '@/entities/snap';

import { describeSession } from '../lib/describe-match';
import {
  groupIntoSessions,
  pickBestSession,
  sessionConfidence,
  spreadAcrossSlots,
} from '../lib/match-template';

/** One slot of the template, with whatever the match put in it. */
export type FilledSlot = {
  slot: TemplateSlot;
  /** The snap the match proposed, or the user shot for it. Absent when empty. */
  snap?: Snap;
  /**
   * How sure the match is that this snap belongs to the outing, 0–1. Absent for
   * an empty slot and for one the user filled by shooting — a snap taken *for*
   * this slot needs no confidence, it is an answer rather than a guess.
   */
  confidence?: number;
  /** Set once the user drops the proposal, so the slot can be put back. */
  isDropped: boolean;
  /**
   * Whether {@link TemplateFill.moveSnap} can swap this row with the one above /
   * below it. False at the ends of the list, and false either side of a *pinned*
   * row — one the user shot for or dropped. Those two are bound to their slot
   * rather than to the match's running order, so a swap could not move them and
   * the arrow says so instead of doing nothing.
   */
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export type TemplateFill = {
  slots: FilledSlot[];
  /** Slots that hold a snap — the cuts the movie would be made of. */
  filledCount: number;
  /** How long the movie would run. */
  totalSec: number;
  /** One line saying why these snaps (see `describeSession`). */
  summary: string;
  /** Whether the library had an outing to propose at all. */
  hasMatch: boolean;
  /** Drops the snap in a slot, leaving it empty and offering it back. */
  dropSlot: (slotId: string) => void;
  restoreSlot: (slotId: string) => void;
  /** Puts a snap the user just shot into the slot that asked for it. */
  fillSlot: (slotId: string, snap: Snap) => void;
  /**
   * Swaps the snap at `index` with its neighbour one step in `direction`, so the
   * cuts play in a different order than the outing happened. Check the row's
   * `canMoveUp` / `canMoveDown` first; a swap the pair cannot make is ignored.
   */
  moveSnap: (index: number, direction: -1 | 1) => void;
  /** Puts every slot back the way the match proposed it. */
  resetSlots: () => void;
  /** Whether anything has been dropped, shot, or reordered since the match ran. */
  isEdited: boolean;
  /** The cut list a movie would be created from, in slot order. */
  snapIds: string[];
};

/**
 * Matches the library against a template, and lets the user correct the result.
 *
 * The match is deliberately the *only* automatic thing here. What it produces is
 * a proposal laid out in the order the outing happened; the user drops what does
 * not belong, shoots what is missing, and reorders what the clock got wrong.
 * Anything past the cut list — a trim, a style that does not suit it — is fixed
 * after the movie has been made and watched (see `features/compose-movie`).
 *
 * Order is held as a permutation of the proposal rather than as a reordered snap
 * list, because the slots must stay put: `출발` is the template's first scene
 * whatever ends up in it, so moving a snap *up* means trading places with the
 * snap above, never renaming the row.
 *
 * Manual changes are held here rather than written anywhere: nothing exists to
 * write to until the movie is created, and abandoning the screen should cost
 * nothing.
 */
export function useTemplateFill(template: MovieTemplate | undefined): TemplateFill {
  const snaps = useSnaps();
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());
  const [shot, setShot] = useState<Readonly<Record<string, Snap>>>({});
  // Which proposal entry each slot draws from. A permutation rather than a
  // reordered snap list, because the slots themselves must not move: `출발` is
  // the first scene of the template whatever ends up in it. `undefined` is the
  // identity — the order the outing happened, which is what the match proposed.
  const [order, setOrder] = useState<readonly number[]>();

  // The match is a pure function of the library and the template, so it re-runs
  // exactly when one of them changes — which is what makes a snap shot for an
  // empty slot show up the moment the user comes back from the camera.
  const { proposal, session } = useMemo(() => {
    const slots = template?.slots ?? [];
    const best = pickBestSession(groupIntoSessions(snaps), slots.length);
    if (!best) return { proposal: [], session: undefined };
    return { proposal: spreadAcrossSlots(best.snaps, slots.length), session: best };
  }, [template, snaps]);

  const slots: FilledSlot[] = useMemo(() => {
    // A snap shot for an empty slot lands in the library, so the next match will
    // happily propose it for a *different* slot too. Claiming it here keeps one
    // snap out of two cuts, which `createMovie` would otherwise store verbatim.
    const claimed = new Set(Object.values(shot).map((snap) => snap.id));
    const templateSlots = template?.slots ?? [];
    // A permutation from a previous template, or from before the library changed
    // the slot count, cannot be applied — fall back to the proposed order rather
    // than reading past the end of it.
    const positions =
      order?.length === templateSlots.length ? order : templateSlots.map((_, index) => index);

    const resolved = templateSlots.map((slot, index) => {
      const manual = shot[slot.id];
      // Pinned: bound to this slot rather than to a position in the running
      // order, so `moveSnap` has nothing it could swap.
      if (manual) {
        return { slot, snap: manual, isDropped: false, isPinned: true };
      }

      const isDropped = dropped.has(slot.id);
      const candidate = proposal[positions[index]];
      const proposed =
        isDropped || (candidate && claimed.has(candidate.id)) ? undefined : candidate;
      return {
        slot,
        snap: proposed,
        confidence: proposed && session ? sessionConfidence(proposed, session) : undefined,
        isDropped,
        isPinned: isDropped,
      };
    });

    const canSwap = (index: number) =>
      index >= 0 && index < resolved.length && !resolved[index].isPinned;

    return resolved.map(({ isPinned, ...filled }, index) => ({
      ...filled,
      canMoveUp: !isPinned && canSwap(index - 1),
      canMoveDown: !isPinned && canSwap(index + 1),
    }));
  }, [template, proposal, session, dropped, shot, order]);

  const used = slots.flatMap((filled) => (filled.snap ? [filled.snap] : []));

  // Stable identities: the screen hands `fillSlot` to a focus effect that must
  // not re-subscribe on every render just because the hook rebuilt its result.
  const dropSlot = useCallback(
    (slotId: string) =>
      setDropped((current) => {
        const next = new Set(current);
        next.add(slotId);
        return next;
      }),
    [],
  );
  const restoreSlot = useCallback(
    (slotId: string) =>
      setDropped((current) => {
        const next = new Set(current);
        next.delete(slotId);
        return next;
      }),
    [],
  );
  const fillSlot = useCallback(
    (slotId: string, snap: Snap) => setShot((current) => ({ ...current, [slotId]: snap })),
    [],
  );
  const slotCount = template?.slots.length ?? 0;
  const moveSnap = useCallback(
    (index: number, direction: -1 | 1) =>
      setOrder((current) => {
        const target = index + direction;
        if (index < 0 || target < 0 || index >= slotCount || target >= slotCount) return current;

        const next = [
          ...(current?.length === slotCount
            ? current
            : Array.from({ length: slotCount }, (_, i) => i)),
        ];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      }),
    [slotCount],
  );
  const resetSlots = useCallback(() => {
    setDropped(new Set());
    setShot({});
    setOrder(undefined);
  }, []);

  return {
    slots,
    filledCount: used.length,
    totalSec: used.reduce((total, snap) => total + snap.durationSec, 0),
    summary: session
      ? describeSession(session, used)
      : '아직 한 편으로 묶을 만한 스냅이 없어요. 빈 자리를 찍어서 채워보세요.',
    hasMatch: session !== undefined,
    dropSlot,
    restoreSlot,
    fillSlot,
    moveSnap,
    isEdited: dropped.size > 0 || Object.keys(shot).length > 0 || order !== undefined,
    resetSlots,
    snapIds: used.map((snap) => snap.id),
  };
}
