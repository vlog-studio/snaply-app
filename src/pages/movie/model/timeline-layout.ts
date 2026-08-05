/**
 * The seconds↔pixels layout of the timeline strip.
 *
 * The strip draws every cut at a width proportional to how long it plays, with
 * a ruler of second marks above, so the arithmetic that places things is one
 * pure module: the strip and the ruler cannot disagree about where a second
 * is. The trim gesture's own math stays in `trim-geometry` — this module only
 * decides how wide each cut is drawn and where the ruler's ticks fall.
 */

/** How many points one second of playback occupies in the strip. */
export const TimelinePxPerSec = 60;

/**
 * The stand-in length for a cut whose original was deleted. It plays nothing,
 * but it must stay visible and tappable — that is where it gets removed.
 */
export const DeadCutSec = 1;

/** What the layout needs to know about one cut. */
export type TimelineCutSize = {
  /** How long the cut plays (its trim window, or the whole snap). */
  usedSec: number;
  /** The whole snap's length, or `undefined` when the original was deleted. */
  fullSec: number | undefined;
  /**
   * Seconds trimmed off the front, absent when the cut plays from the start.
   * Only an expanded cut needs it: that clip draws the whole snap, so the moment
   * being played sits this much past the clip's left edge instead of at it.
   */
  leadSec?: number;
};

/** Where one cut sits in the strip, in points from the first cut's left edge. */
export type TimelineCutMetric = {
  x: number;
  width: number;
};

/**
 * How many seconds of strip one cut occupies. A cut being trimmed (`expanded`)
 * shows its whole snap — the window is dragged over the full reel — and a dead
 * cut gets the stand-in length.
 */
export function cutDisplaySec(size: TimelineCutSize, expanded: boolean): number {
  if (size.fullSec === undefined) return DeadCutSec;
  return expanded ? size.fullSec : size.usedSec;
}

/**
 * Every cut's place in the strip. Cuts sit flush against each other — a gap
 * would be pixels that stand for no time, and the ruler above would drift off
 * the cuts by one gap per boundary.
 */
export function timelineCutMetrics(
  sizes: readonly TimelineCutSize[],
  expandedIndex: number,
  pxPerSec: number,
): TimelineCutMetric[] {
  let x = 0;
  return sizes.map((size, index) => {
    const width = cutDisplaySec(size, index === expandedIndex) * pxPerSec;
    const metric = { x, width };
    x += width;
    return metric;
  });
}

/** Where the stage is, in the strip's terms: which cut, and how far into it. */
export type TimelinePlayhead = {
  /** Index into the cut list; `-1` when there is nothing to point at. */
  index: number;
  /**
   * Seconds since the cut's own start — the start of its trim window, because
   * that is where playback begins, not where the file does.
   */
  secIntoCut: number;
};

/**
 * Where the moment being played sits in the strip, in points from the first
 * cut's left edge.
 *
 * A collapsed clip draws only the trim window, so the offset lands as it is; an
 * expanded clip draws the whole snap behind the window, so the trimmed-off lead
 * is added back. Held inside the clip either way — a report that arrives a beat
 * after a cut ended must not push the playhead into the next cut's clip.
 */
export function playheadXPx(
  metric: TimelineCutMetric,
  size: TimelineCutSize,
  expanded: boolean,
  secIntoCut: number,
  pxPerSec: number,
): number {
  const lead = expanded ? (size.leadSec ?? 0) : 0;
  const offsetPx = (lead + Math.max(secIntoCut, 0)) * pxPerSec;
  return metric.x + Math.min(offsetPx, metric.width);
}

/** One ruler mark: a labelled second, or an unlabelled half-second dot. */
export type RulerTick = {
  x: number;
  /** Set on whole seconds; the half-second ticks stay dots. */
  labelSec?: number;
};

/**
 * The ruler's marks across the strip: a dot every half second, a numbered
 * label on the whole seconds. Zero is the strip's left edge and needs no mark.
 */
export function rulerTicks(totalWidthPx: number, pxPerSec: number): RulerTick[] {
  if (pxPerSec <= 0) return [];
  const ticks: RulerTick[] = [];
  for (let half = 1; (half / 2) * pxPerSec <= totalWidthPx; half += 1) {
    const sec = half / 2;
    ticks.push({ x: sec * pxPerSec, labelSec: Number.isInteger(sec) ? sec : undefined });
  }
  return ticks;
}
