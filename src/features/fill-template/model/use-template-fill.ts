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
  /** Puts every slot back the way the match proposed it. */
  resetSlots: () => void;
  /** Whether anything has been dropped or shot since the match ran. */
  isEdited: boolean;
  /** The cut list a movie would be created from, in slot order. */
  snapIds: string[];
};

/**
 * Matches the library against a template, and lets the user correct the result.
 *
 * The match is deliberately the *only* automatic thing here. What it produces is
 * a proposal laid out in the order the outing happened; the user drops what does
 * not belong and shoots what is missing. Everything finer — a cut in the wrong
 * place, a style that does not suit it — is fixed after the movie has been made
 * and watched, which is where fixing belongs (see `features/compose-movie`).
 *
 * Manual changes are held here rather than written anywhere: nothing exists to
 * write to until the movie is created, and abandoning the screen should cost
 * nothing.
 */
export function useTemplateFill(template: MovieTemplate | undefined): TemplateFill {
  const snaps = useSnaps();
  const [dropped, setDropped] = useState<ReadonlySet<string>>(new Set());
  const [shot, setShot] = useState<Readonly<Record<string, Snap>>>({});

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

    return (template?.slots ?? []).map((slot, index) => {
      const manual = shot[slot.id];
      if (manual) return { slot, snap: manual, isDropped: false };

      const isDropped = dropped.has(slot.id);
      const candidate = proposal[index];
      const proposed =
        isDropped || (candidate && claimed.has(candidate.id)) ? undefined : candidate;
      return {
        slot,
        snap: proposed,
        confidence: proposed && session ? sessionConfidence(proposed, session) : undefined,
        isDropped,
      };
    });
  }, [template, proposal, session, dropped, shot]);

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
  const resetSlots = useCallback(() => {
    setDropped(new Set());
    setShot({});
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
    isEdited: dropped.size > 0 || Object.keys(shot).length > 0,
    resetSlots,
    snapIds: used.map((snap) => snap.id),
  };
}
