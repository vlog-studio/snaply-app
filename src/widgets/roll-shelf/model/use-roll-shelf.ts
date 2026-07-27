import { useMemo } from 'react';

import { useClips, type Clip } from '@/entities/clip';
import {
  TodayRollTint,
  elapsedDaysInMonth,
  formatDayRange,
  formatMonthKey,
  rollDate,
  rollMonthKey,
  rollTint,
  toDayKey,
  useRolls,
  useTodayRoll,
  type Roll,
  type RollStatus,
  type RollTint,
} from '@/entities/roll';

/** How many clip frames a cover samples for its mosaic. */
const CoverFrameCount = 4;

/**
 * A roll reduced to what the cabinet draws: its identity, how full it is, how
 * long its reel runs, and the first frames its cover samples.
 */
export type RollSummary = {
  id: string;
  title: string;
  /**
   * Set only on a daily roll — the day it collects. Its absence is what marks
   * a roll assembled by hand, whose title is a name rather than a date.
   */
  dayKey?: string;
  /**
   * The day the cabinet files and sorts this roll under: the day a daily roll
   * collects, or the day a hand-made one was bundled. Always answerable.
   */
  date: string;
  /**
   * The days its cuts were captured on, as `07-18` or `07-18~07-24`. Undefined
   * when none of them resolve. This is what a hand-made roll prints where a
   * daily roll prints its date.
   */
  dayRange?: string;
  status: RollStatus;
  clipCount: number;
  /** Total length in seconds, summed from the referenced clips. */
  totalSec: number;
  /** Stable per roll — the same color wherever this roll is drawn. */
  tint: RollTint;
  isToday: boolean;
  /** Up to four clip URIs, in roll order, for the cover mosaic or mini strip. */
  coverUris: string[];
};

/** One month's section of the developed shelf. */
export type DevelopedRollMonth = {
  /** `YYYY-MM`. */
  key: string;
  /** `2026.07`, for the section's edge print. */
  label: string;
  rolls: RollSummary[];
  /**
   * Days of this month that came and went without a single cut. Zero when every
   * elapsed day was collected, or when today is not known yet.
   */
  emptyDayCount: number;
};

type DevelopedRoll = Roll & { reel: NonNullable<Roll['reel']> };

/** A roll counts as developed only once it has both the status and a reel. */
function isDeveloped(roll: Roll): roll is DevelopedRoll {
  return roll.status === 'developed' && roll.reel !== undefined;
}

function inOrder(clipRefs: Roll['clipRefs']): string[] {
  return [...clipRefs].sort((left, right) => left.order - right.order).map((ref) => ref.clipId);
}

function summarize(roll: Roll, clipsById: Map<string, Clip>, todayRollId?: string): RollSummary {
  // A developed roll is summarized from its reel — the finished artifact — and
  // an unfinished one from its current membership.
  const clipIds = isDeveloped(roll) ? inOrder(roll.reel.clipRefs) : inOrder(roll.clipRefs);
  const clips = clipIds
    .map((id) => clipsById.get(id))
    .filter((clip): clip is Clip => Boolean(clip));
  const isToday = roll.id === todayRollId;

  return {
    id: roll.id,
    title: roll.title,
    dayKey: roll.dayKey,
    date: rollDate(roll),
    dayRange: formatDayRange(clips.map((clip) => toDayKey(clip.capturedAt))),
    status: roll.status,
    clipCount: clipIds.length,
    totalSec: clips.reduce((sum, clip) => sum + clip.durationSec, 0),
    tint: isToday ? TodayRollTint : rollTint(roll.id),
    isToday,
    coverUris: clips.slice(0, CoverFrameCount).map((clip) => clip.uri),
  };
}

function useClipsById(): Map<string, Clip> {
  const clips = useClips();
  return useMemo(() => new Map(clips.map((clip) => [clip.id, clip])), [clips]);
}

/**
 * The rolls the cabinet's top lane shows: today's roll, plus every roll that
 * still has a reel waiting to be made. Today's roll is always present even with
 * no cuts yet — it is the invitation to capture — while other rolls appear only
 * once they hold something to develop.
 *
 * Rolls bundled by hand stand in this lane beside the daily ones. The condition
 * is about what can be developed, not about having a day: everything a user can
 * develop has to be in one place for "waiting" to mean anything.
 *
 * The filter is "not finished" rather than "undeveloped", so a roll left in
 * `developing` by an interrupted ceremony still surfaces here instead of
 * falling between this lane and the developed shelf.
 */
export function useRollsAwaitingDevelop(): RollSummary[] {
  const rolls = useRolls();
  const todayRoll = useTodayRoll();
  const clipsById = useClipsById();

  return useMemo(() => {
    const todayRollId = todayRoll?.id;
    return rolls
      .filter((roll) => !isDeveloped(roll) && (roll.id === todayRollId || roll.clipRefs.length > 0))
      .sort((left, right) => {
        if (left.id === todayRollId) return -1;
        if (right.id === todayRollId) return 1;
        return right.createdAt - left.createdAt;
      })
      .map((roll) => summarize(roll, clipsById, todayRollId));
  }, [rolls, todayRoll, clipsById]);
}

function countEmptyDays(
  monthKey: string,
  todayDayKey: string,
  collectedDays: ReadonlySet<string>,
): number {
  const elapsed = elapsedDaysInMonth(monthKey, todayDayKey);
  let collected = 0;
  for (let day = 1; day <= elapsed; day += 1) {
    if (collectedDays.has(`${monthKey}-${String(day).padStart(2, '0')}`)) collected += 1;
  }
  return elapsed - collected;
}

/**
 * The developed shelf, split into month sections newest month first and newest
 * roll first inside each.
 *
 * Each section also reports how many of its elapsed days hold no cut at all, so
 * the shelf shows the gaps as well as what was kept (concept §4). That count
 * needs to know which day today is; it reads it from today's roll rather than
 * the clock, keeping this a pure selector. Before today's roll exists the count
 * is reported as zero rather than guessed.
 */
export function useDevelopedRollMonths(): DevelopedRollMonth[] {
  const rolls = useRolls();
  const todayRoll = useTodayRoll();
  const clipsById = useClipsById();

  return useMemo(() => {
    const todayDayKey = todayRoll?.dayKey;

    // Any roll holding cuts marks its day as collected, developed or not — an
    // undeveloped day is not an empty one.
    const collectedDays = new Set<string>();
    for (const roll of rolls) {
      if (roll.dayKey && roll.clipRefs.length > 0) collectedDays.add(roll.dayKey);
    }

    const sections = new Map<string, RollSummary[]>();
    for (const roll of rolls) {
      if (!isDeveloped(roll)) continue;
      const monthKey = rollMonthKey(roll);
      const summary = summarize(roll, clipsById, todayRoll?.id);
      const existing = sections.get(monthKey);
      if (existing) existing.push(summary);
      else sections.set(monthKey, [summary]);
    }

    return [...sections.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([key, monthRolls]) => ({
        key,
        label: formatMonthKey(key),
        // Sorted by the day each roll stands for, not by `dayKey` — a
        // hand-made roll has none, and sorting on it would file every one of
        // them at the bottom of its month.
        rolls: monthRolls.sort((left, right) => right.date.localeCompare(left.date)),
        emptyDayCount: todayDayKey ? countEmptyDays(key, todayDayKey, collectedDays) : 0,
      }));
  }, [rolls, todayRoll, clipsById]);
}

/** Formats a reel length in seconds as `m:ss` for a cover's edge print. */
export function formatReelLength(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
