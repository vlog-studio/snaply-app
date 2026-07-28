import { useMemo } from 'react';

import { useClips, useClipsHydrated, type Clip } from '@/entities/clip';
import { DailyRollTarget, toDayKey, useTodayRoll, type RollTint } from '@/entities/roll';
import { formatDayHeading, relativeDayLabel } from '@/shared/lib/datetime';
import { useClipMembership, type ClipRollBadge } from '@/widgets/clip-membership';

/**
 * Which cuts the strip shows. The first three read the whole archive; `roll`
 * narrows it to one roll and is the only context in which "이 롤에서 빼기" can
 * mean anything (that action lands with the write step).
 */
export type CutFilter =
  { kind: 'all' } | { kind: 'undeveloped' } | { kind: 'loose' } | { kind: 'roll'; rollId: string };

/** A cut as the strip draws it: the frame, its edge number, and its rolls. */
export type StripCut = {
  clip: Clip;
  /** Archive-wide, newest-first: `01` is the oldest cut ever kept. */
  no: string;
  /** Rolls holding this cut, today's first. Empty means no roll holds it. */
  rolls: ClipRollBadge[];
};

/**
 * Where a day stands in the develop cycle. Read from the day itself, not from
 * the cuts a filter left on screen, so filtering never restates a day's status.
 */
export type CutDayStatus = 'collecting' | 'ready' | 'developed';

/** One day of the archive — one horizontal strip of film. */
export type CutDay = {
  /** `YYYY-MM-DD`, the same key a daily roll is identified by. */
  dayKey: string;
  /** `오늘` / `어제` / `2026년 7월 20일`. */
  label: string;
  /** Set only for the two days that have a name, so a heading can add the date. */
  relativeLabel: string | undefined;
  cuts: StripCut[];
  status: CutDayStatus;
  /** Length of the cuts shown, in seconds. */
  totalSec: number;
  /**
   * Frames still open against the daily soft target. Today only: a past day's
   * unfilled frames are not an invitation, they are a day that is over.
   */
  emptySlotCount: number;
};

export type CutStrip = {
  days: CutDay[];
  /** Cuts the current filter keeps. */
  count: number;
  /** Every cut in the archive, whatever the filter. */
  totalCount: number;
  /** Cuts no roll references at all — what the `롤 없음` filter selects. */
  looseCount: number;
  /** False until the clip store has read itself back from disk. */
  isHydrated: boolean;
};

/** A roll offered in the `롤별` picker, with how many cuts it holds. */
export type CutRollFilterOption = {
  rollId: string;
  title: string;
  tint: RollTint;
  isToday: boolean;
  cutCount: number;
  /**
   * False once the roll is developed. Filtering by such a roll is fine — you
   * can still look at it — but 롤에서 빼기 must not be offered for it.
   */
  canEditMembership: boolean;
};

const NoRolls: ClipRollBadge[] = [];

function matchesFilter(filter: CutFilter, rolls: ClipRollBadge[]): boolean {
  switch (filter.kind) {
    case 'all':
      return true;
    case 'loose':
      return rolls.length === 0;
    // Not "belongs to an undeveloped roll" but "no reel has been made of it" —
    // which is also true of a cut no roll holds at all, the loosest case of
    // undeveloped there is.
    case 'undeveloped':
      return rolls.every((roll) => roll.status !== 'developed');
    case 'roll':
      return rolls.some((roll) => roll.rollId === filter.rollId);
  }
}

/**
 * The contact strip: every original cut, grouped into one horizontal strip per
 * day and narrowed by the active filter.
 *
 * Cuts come from `entities/clip`, not from the recording files on disk. The
 * clip store is what carries duration, mood, orientation, and tags, and it is
 * what rolls actually reference — reading the file list instead left the screen
 * unable to show any of it, and unable to say which roll a frame belongs to
 * without a second lookup.
 *
 * Days are keyed with `toDayKey`, the daily roll's own key, so a strip and the
 * roll that collected it always line up.
 */
export function useCutStrip(filter: CutFilter): CutStrip {
  const clips = useClips();
  const isHydrated = useClipsHydrated();
  const membership = useClipMembership();
  const todayDayKey = useTodayRoll()?.dayKey;

  return useMemo(() => {
    // The store prepends, but capture order is not something to depend on for
    // numbering — sort by the moment itself.
    const newestFirst = [...clips].sort((left, right) => right.capturedAt - left.capturedAt);
    const total = newestFirst.length;

    const entries = newestFirst.map((clip, index) => ({
      clip,
      dayKey: toDayKey(clip.capturedAt),
      cut: {
        clip,
        no: String(total - index).padStart(2, '0'),
        rolls: membership.get(clip.id) ?? NoRolls,
      } satisfies StripCut,
    }));

    // Day facts are read from every cut of the day, before the filter runs. A
    // day whose developed cuts are filtered out is still a developed day.
    const developedDays = new Set<string>();
    const dayCutCounts = new Map<string, number>();
    let looseCount = 0;
    for (const entry of entries) {
      dayCutCounts.set(entry.dayKey, (dayCutCounts.get(entry.dayKey) ?? 0) + 1);
      if (entry.cut.rolls.length === 0) looseCount += 1;
      if (entry.cut.rolls.some((roll) => roll.status === 'developed')) {
        developedDays.add(entry.dayKey);
      }
    }

    const days: CutDay[] = [];
    const byDayKey = new Map<string, CutDay>();
    let count = 0;

    for (const entry of entries) {
      if (!matchesFilter(filter, entry.cut.rolls)) continue;
      count += 1;

      let day = byDayKey.get(entry.dayKey);
      if (!day) {
        const isToday = entry.dayKey === todayDayKey;
        day = {
          dayKey: entry.dayKey,
          label: formatDayHeading(entry.clip.capturedAt),
          relativeLabel: relativeDayLabel(entry.clip.capturedAt),
          cuts: [],
          status: isToday ? 'collecting' : developedDays.has(entry.dayKey) ? 'developed' : 'ready',
          totalSec: 0,
          // Only an unfiltered strip may show open frames: a filtered day is a
          // subset of itself, and padding it to twelve would promise frames the
          // filter is hiding.
          emptySlotCount:
            isToday && filter.kind === 'all'
              ? Math.max(DailyRollTarget - (dayCutCounts.get(entry.dayKey) ?? 0), 0)
              : 0,
        };
        byDayKey.set(entry.dayKey, day);
        days.push(day);
      }

      day.cuts.push(entry.cut);
      day.totalSec += entry.clip.durationSec;
    }

    return { days, count, totalCount: total, looseCount, isHydrated };
  }, [clips, membership, filter, todayDayKey, isHydrated]);
}

/**
 * The rolls the `롤별` picker offers: every roll that actually holds a cut,
 * today's first and then in order of its most recent cut. A roll holding
 * nothing is left out — filtering by it could only ever return an empty strip.
 */
export function useCutRollFilters(): CutRollFilterOption[] {
  const clips = useClips();
  const membership = useClipMembership();

  return useMemo(() => {
    const newestFirst = [...clips].sort((left, right) => right.capturedAt - left.capturedAt);
    const options = new Map<string, CutRollFilterOption>();

    for (const clip of newestFirst) {
      for (const roll of membership.get(clip.id) ?? NoRolls) {
        const existing = options.get(roll.rollId);
        if (existing) existing.cutCount += 1;
        else
          options.set(roll.rollId, {
            rollId: roll.rollId,
            title: roll.title,
            tint: roll.tint,
            isToday: roll.isToday,
            cutCount: 1,
            canEditMembership: roll.canEditMembership,
          });
      }
    }

    // Insertion order is "most recently collected first"; today's roll is
    // pinned ahead of it so the roll being filled is always the first choice.
    return [...options.values()].sort(
      (left, right) => Number(right.isToday) - Number(left.isToday),
    );
  }, [clips, membership]);
}
