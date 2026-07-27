import { useMemo } from 'react';

import {
  TodayRollTint,
  rollTint,
  useRolls,
  useTodayRoll,
  type Roll,
  type RollStatus,
  type RollTint,
} from '@/entities/roll';

/**
 * One roll a clip belongs to, reduced to what a membership surface needs to
 * draw and act on it.
 */
export type ClipRollBadge = {
  rollId: string;
  title: string;
  /** Stable per roll, so the same roll reads as one color across surfaces. */
  tint: RollTint;
  status: RollStatus;
  isToday: boolean;
  /**
   * Whether this clip may still be added to or removed from the roll. A
   * developed roll's reel is a finished artifact, so its membership is frozen
   * (the same rule `roll-detail` enforces for editing).
   */
  canEditMembership: boolean;
};

const NoRolls: ClipRollBadge[] = [];

/** Today's roll first, then the most recently created roll. */
function byTodayThenNewest(todayRollId: string | undefined) {
  return (left: Roll, right: Roll) => {
    if (left.id === todayRollId) return -1;
    if (right.id === todayRollId) return 1;
    return right.createdAt - left.createdAt;
  };
}

function toBadge(roll: Roll, todayRollId: string | undefined): ClipRollBadge {
  const isToday = roll.id === todayRollId;
  return {
    rollId: roll.id,
    title: roll.title,
    tint: isToday ? TodayRollTint : rollTint(roll.id),
    status: roll.status,
    isToday,
    canEditMembership: roll.status === 'undeveloped',
  };
}

/**
 * The reverse of `roll.clipRefs`: which rolls each clip belongs to, keyed by
 * clip id. Rolls store their membership forward, but every clip-side surface —
 * the contact strip's roll dots, the cut sheet's roll list, the delete
 * confirmation's affected-rolls list — needs to read it backwards.
 *
 * Cross-entity composition (rolls + the today-roll selection) that neither
 * entity may own, and it is read by more than one screen, so it lives in a
 * widget for the same reason `roll-shelf` does.
 *
 * Clips belonging to no roll are simply absent from the map — that absence is
 * what the "롤 없음" filter selects on.
 */
export function useClipMembership(): ReadonlyMap<string, ClipRollBadge[]> {
  const rolls = useRolls();
  const todayRollId = useTodayRoll()?.id;

  return useMemo(() => {
    const membership = new Map<string, ClipRollBadge[]>();
    for (const roll of [...rolls].sort(byTodayThenNewest(todayRollId))) {
      const badge = toBadge(roll, todayRollId);
      for (const ref of roll.clipRefs) {
        const badges = membership.get(ref.clipId);
        if (badges) badges.push(badge);
        else membership.set(ref.clipId, [badge]);
      }
    }
    return membership;
  }, [rolls, todayRollId]);
}

/** The rolls one clip belongs to, ordered today-first then newest-first. */
export function useRollsForClip(clipId: string | undefined): ClipRollBadge[] {
  const membership = useClipMembership();
  return (clipId ? membership.get(clipId) : undefined) ?? NoRolls;
}

/**
 * The rolls a set of clips belongs to, deduplicated — what a batch action needs
 * in order to name the rolls it is about to affect.
 */
export function selectRollsForClips(
  membership: ReadonlyMap<string, ClipRollBadge[]>,
  clipIds: readonly string[],
): ClipRollBadge[] {
  const byRollId = new Map<string, ClipRollBadge>();
  for (const clipId of clipIds) {
    for (const badge of membership.get(clipId) ?? NoRolls) {
      if (!byRollId.has(badge.rollId)) byRollId.set(badge.rollId, badge);
    }
  }
  return [...byRollId.values()];
}
