import {
  DeadCutSec,
  cutDisplaySec,
  playheadXPx,
  rulerTicks,
  timelineCutMetrics,
  type TimelineCutSize,
} from './timeline-layout';

const alive = (usedSec: number, fullSec: number): TimelineCutSize => ({ usedSec, fullSec });
const dead: TimelineCutSize = { usedSec: 0, fullSec: undefined };

describe('cutDisplaySec', () => {
  it.each([
    // An untrimmed cut plays the whole snap either way.
    ['untrimmed, collapsed', alive(4, 4), false, 4],
    ['untrimmed, expanded', alive(4, 4), true, 4],
    // A trimmed cut shows its window until it is being edited, then the reel.
    ['trimmed, collapsed', alive(1.5, 4), false, 1.5],
    ['trimmed, expanded', alive(1.5, 4), true, 4],
    // A dead cut has no length of its own; the stand-in keeps it visible.
    ['dead, collapsed', dead, false, DeadCutSec],
    ['dead, expanded', dead, true, DeadCutSec],
  ])('measures a %s cut', (_name, size, expanded, expected) => {
    expect(cutDisplaySec(size, expanded)).toBe(expected);
  });
});

describe('timelineCutMetrics', () => {
  it('lays the cuts flush, each starting where the previous one ends', () => {
    expect(timelineCutMetrics([alive(2, 2), alive(1.5, 4), alive(3, 3)], -1, 60)).toEqual([
      { x: 0, width: 120 },
      { x: 120, width: 90 },
      { x: 210, width: 180 },
    ]);
  });

  it('widens the expanded cut to its whole snap and shifts what follows', () => {
    expect(timelineCutMetrics([alive(2, 2), alive(1.5, 4), alive(3, 3)], 1, 60)).toEqual([
      { x: 0, width: 120 },
      { x: 120, width: 240 },
      { x: 360, width: 180 },
    ]);
  });

  it('gives a dead cut the stand-in width', () => {
    expect(timelineCutMetrics([dead, alive(2, 2)], -1, 60)).toEqual([
      { x: 0, width: DeadCutSec * 60 },
      { x: DeadCutSec * 60, width: 120 },
    ]);
  });

  it('is empty for no cuts', () => {
    expect(timelineCutMetrics([], -1, 60)).toEqual([]);
  });
});

describe('playheadXPx', () => {
  const metric = { x: 120, width: 240 };
  // A cut that starts a second and a half into its snap and runs for four.
  const trimmed: TimelineCutSize = { usedSec: 4, fullSec: 5.5, leadSec: 1.5 };

  it('measures a collapsed cut from its own left edge, since that is its start', () => {
    expect(playheadXPx(metric, trimmed, false, 2, 60)).toBe(240);
  });

  it('adds the trimmed-off lead back on an expanded cut, which draws the whole snap', () => {
    expect(playheadXPx(metric, trimmed, true, 2, 60)).toBe(330);
  });

  it('sits at the left edge at the start of the cut', () => {
    expect(playheadXPx(metric, trimmed, false, 0, 60)).toBe(120);
  });

  it('is held inside the clip when a report arrives after the cut ended', () => {
    expect(playheadXPx(metric, trimmed, false, 99, 60)).toBe(360);
  });

  it('treats a cut with no lead as starting at its file', () => {
    expect(playheadXPx(metric, { usedSec: 4, fullSec: 4 }, true, 1, 60)).toBe(180);
  });
});

describe('rulerTicks', () => {
  it('marks every half second, labelling the whole ones, with no mark at zero', () => {
    expect(rulerTicks(150, 60)).toEqual([
      { x: 30, labelSec: undefined },
      { x: 60, labelSec: 1 },
      { x: 90, labelSec: undefined },
      { x: 120, labelSec: 2 },
      { x: 150, labelSec: undefined },
    ]);
  });

  it('stops at the strip edge rather than marking past the last cut', () => {
    expect(rulerTicks(149, 60)).toHaveLength(4);
  });

  it.each([
    ['an empty strip', 0, 60],
    ['a degenerate scale', 150, 0],
  ])('is empty for %s', (_name, widthPx, pxPerSec) => {
    expect(rulerTicks(widthPx, pxPerSec)).toEqual([]);
  });
});
