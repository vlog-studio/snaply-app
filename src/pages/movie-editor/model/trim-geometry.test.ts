import { clampPx, minGapPx, secToX, windowSignature, xToSec } from './trim-geometry';

const track = { width: 200, durationSec: 4, stepSec: 0.5 };

describe('secToX', () => {
  it.each([
    [0, 0],
    [1, 50],
    [4, 200],
    // Outside the snap is held at the ends rather than drawn off the track.
    [-1, 0],
    [9, 200],
  ])('puts %p seconds at %p points', (sec, expected) => {
    expect(secToX(sec, track)).toBe(expected);
  });

  it('is zero for a snap of unknown length', () => {
    expect(secToX(2, { ...track, durationSec: 0 })).toBe(0);
  });
});

describe('xToSec', () => {
  it.each([
    [0, 0],
    [50, 1],
    [200, 4],
    // Between two steps, the nearer one wins.
    [30, 0.5],
    [45, 1],
    [400, 4],
  ])('reads %p points as %p seconds', (x, expected) => {
    expect(xToSec(x, track)).toBe(expected);
  });

  it.each([
    ['a track with no width', { ...track, width: 0 }],
    ['a step of zero', { ...track, stepSec: 0 }],
  ])('is zero for %s rather than dividing by it', (_name, degenerate) => {
    expect(xToSec(50, degenerate)).toBe(0);
  });
});

describe('clampPx', () => {
  it.each([
    [5, 0, 10, 5],
    [-5, 0, 10, 0],
    [50, 0, 10, 10],
    // A window narrower than the minimum gap inverts the bounds; the lower one
    // wins, so a handle never jumps behind its own limit.
    [5, 10, 0, 10],
  ])('clamps %p within %p..%p to %p', (value, min, max, expected) => {
    expect(clampPx(value, min, max)).toBe(expected);
  });
});

describe('minGapPx', () => {
  it('measures the minimum cut length in track points', () => {
    expect(minGapPx(1, track)).toBe(50);
  });
});

describe('windowSignature', () => {
  it('separates every window a half-second grid can produce', () => {
    const windows: number[] = [];
    for (let start = 0; start <= 5; start += 0.5) {
      for (let end = start + 1; end <= 5; end += 0.5) {
        windows.push(windowSignature(start, end));
      }
    }
    expect(new Set(windows).size).toBe(windows.length);
  });
});
