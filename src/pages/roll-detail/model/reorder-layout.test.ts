import { gridHeight, movedOrder, slotIndexAtPoint, slotPoint, type ReorderGridSpec } from './reorder-layout';

const spec: ReorderGridSpec = { columns: 3, cellWidth: 100, cellHeight: 140, gap: 12 };

describe('slotPoint', () => {
  it.each([
    [0, 0, 0],
    [1, 112, 0],
    [2, 224, 0],
    [3, 0, 152],
    [7, 112, 304],
  ])('slot %i sits at (%i, %i)', (index, x, y) => {
    expect(slotPoint(index, spec)).toEqual({ x, y });
  });
});

describe('slotIndexAtPoint', () => {
  it.each([
    // Center of each cell resolves to its own slot.
    [50, 70, 0],
    [162, 70, 1],
    [274, 70, 2],
    [50, 222, 3],
    [162, 374, 7],
  ])('point (%i, %i) falls into slot %i', (x, y, expected) => {
    expect(slotIndexAtPoint(x, y, spec, 12)).toBe(expected);
  });

  it('clamps points left of and above the grid to slot 0', () => {
    expect(slotIndexAtPoint(-40, -40, spec, 12)).toBe(0);
  });

  it('clamps points past the right edge to the last column', () => {
    expect(slotIndexAtPoint(900, 70, spec, 12)).toBe(2);
  });

  it('clamps points below the last row to the last slot', () => {
    expect(slotIndexAtPoint(162, 9999, spec, 5)).toBe(4);
  });

  it('returns 0 when there are no slots', () => {
    expect(slotIndexAtPoint(50, 70, spec, 0)).toBe(0);
  });
});

describe('movedOrder', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('moves an id forward and shifts the ids in between back', () => {
    expect(movedOrder(order, 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an id backward and shifts the ids in between forward', () => {
    expect(movedOrder(order, 'd', 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('returns an equal order when the target is the current position', () => {
    expect(movedOrder(order, 'b', 1)).toEqual(order);
  });

  it('clamps an out-of-range target to the ends', () => {
    expect(movedOrder(order, 'b', 99)).toEqual(['a', 'c', 'd', 'b']);
    expect(movedOrder(order, 'c', -5)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores an unknown id', () => {
    expect(movedOrder(order, 'ghost', 1)).toEqual(order);
  });

  it('never mutates the input order', () => {
    movedOrder(order, 'a', 3);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('gridHeight', () => {
  it.each([
    [0, 0],
    [1, 140],
    [3, 140],
    [4, 292],
    [12, 596],
  ])('%i slots need a height of %i', (slotCount, expected) => {
    expect(gridHeight(slotCount, spec)).toBe(expected);
  });
});
