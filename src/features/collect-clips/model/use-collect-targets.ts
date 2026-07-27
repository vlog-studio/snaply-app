import { useMemo } from 'react';

import { TodayRollTint, rollTint, useRolls, useTodayRoll, type RollTint } from '@/entities/roll';

/** A roll the selected cuts can be put into, and how much of them it already has. */
export type CollectTarget = {
  rollId: string;
  title: string;
  /** Stable per roll, so a target reads as the same color as its strip dots. */
  tint: RollTint;
  isToday: boolean;
  /** Cuts the roll holds right now. */
  cutCount: number;
  /** How many of the offered cuts it already holds. */
  heldCount: number;
  /** True when it holds every offered cut — there is nothing left to add. */
  holdsAll: boolean;
};

/**
 * The rolls 롤에 담기 may target: every undeveloped roll, today's first and then
 * the most recently created.
 *
 * Only undeveloped rolls are offered. A developed roll's reel is finished, so
 * adding to it would have to be refused after the fact — better not to offer
 * it. Unlike the strip's roll filter, a roll holding nothing is a perfectly good
 * target and stays in the list; today's empty roll is usually the one you want.
 *
 * `heldCount` is what lets the list say "already in this roll" instead of
 * silently adding nothing.
 */
export function useCollectTargets(clipIds: readonly string[]): CollectTarget[] {
  const rolls = useRolls();
  const todayRollId = useTodayRoll()?.id;

  return useMemo(() => {
    const offered = new Set(clipIds);

    return rolls
      .filter((roll) => roll.status === 'undeveloped')
      .sort((left, right) => {
        if (left.id === todayRollId) return -1;
        if (right.id === todayRollId) return 1;
        return right.createdAt - left.createdAt;
      })
      .map((roll) => {
        const isToday = roll.id === todayRollId;
        const heldCount = roll.clipRefs.filter((ref) => offered.has(ref.clipId)).length;
        return {
          rollId: roll.id,
          title: roll.title,
          tint: isToday ? TodayRollTint : rollTint(roll.id),
          isToday,
          cutCount: roll.clipRefs.length,
          heldCount,
          holdsAll: offered.size > 0 && heldCount === offered.size,
        };
      });
  }, [rolls, todayRollId, clipIds]);
}
