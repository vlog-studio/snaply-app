/**
 * A roll's character — its look, BGM tone, default length, and cover style
 * (concept §3). The MVP only creates `daily` rolls; the rest are modeled up
 * front so the N:M data shape does not change when themed rolls arrive.
 */
export type RollType = 'daily' | 'travel' | 'challenge' | 'growth' | 'free';

/** How clips enter a roll (concept §3). `all-day` backs the daily roll. */
export type CollectionRule = 'manual' | 'period' | 'location' | 'tag' | 'all-day';

/** The aspect ratio a roll aims for; determines the developed reel's ratio. */
export type TargetOrientation = 'portrait' | 'landscape' | 'square';

/** Development lifecycle of a roll (concept §4, the "delayed development" hook). */
export type RollStatus = 'undeveloped' | 'developing' | 'developed';

/**
 * A roll's reference to a clip. The clip original is immutable; per-roll edit
 * information (order within the roll, optional trim) lives here so the same clip
 * can appear differently in different rolls (concept §3).
 */
export type ClipRef = {
  clipId: string;
  order: number;
  trim?: { startSec: number; endSec: number };
};

/**
 * The developed result of a roll — an ordered playlist of clip references plus
 * composition metadata. For the MVP this is a sequential playlist, not a
 * single rendered file (see mvp-implementation-plan.md §5).
 */
export type Reel = {
  clipRefs: ClipRef[];
  bgm?: string;
  transition?: string;
  developedAt: number;
};

/**
 * A roll — a curated, editable album that references clips (N:M). The original
 * clips are never mutated; the roll owns membership, ordering, and development
 * state.
 */
export type Roll = {
  id: string;
  type: RollType;
  collectionRule: CollectionRule;
  targetOrientation: TargetOrientation;
  status: RollStatus;
  /** Epoch milliseconds when the roll was created. */
  createdAt: number;
  /** Local `YYYY-MM-DD` day key for daily rolls; identifies "today's roll". */
  dayKey?: string;
  title: string;
  clipRefs: ClipRef[];
  reel?: Reel;
};
