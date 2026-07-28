/**
 * Pure geometry and ordering rules for the roll-detail drag-reorder grid.
 *
 * The reorder grid positions every cut absolutely inside a fixed 3-column
 * contact sheet, so "which slot is the finger over" and "where does slot N
 * live" are plain math over the measured cell size. The functions are
 * worklet-marked because the drag gesture and the settle animations evaluate
 * them on the UI thread; under Jest the directive is inert and they run as
 * ordinary functions.
 */
export type ReorderGridSpec = {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
};

/** Top-left corner of a slot, in grid-container coordinates. */
export function slotPoint(index: number, spec: ReorderGridSpec): { x: number; y: number } {
  'worklet';
  const column = index % spec.columns;
  const row = Math.floor(index / spec.columns);
  return {
    x: column * (spec.cellWidth + spec.gap),
    y: row * (spec.cellHeight + spec.gap),
  };
}

/**
 * The slot a point (the dragged cut's center) falls into. Points outside the
 * grid clamp to the nearest valid slot, so a drag past an edge still lands on
 * the first/last column or the last occupied slot instead of vanishing.
 */
export function slotIndexAtPoint(
  x: number,
  y: number,
  spec: ReorderGridSpec,
  slotCount: number,
): number {
  'worklet';
  if (slotCount <= 0) return 0;
  const column = Math.min(
    spec.columns - 1,
    Math.max(0, Math.floor(x / (spec.cellWidth + spec.gap))),
  );
  const row = Math.max(0, Math.floor(y / (spec.cellHeight + spec.gap)));
  return Math.min(row * spec.columns + column, slotCount - 1);
}

/**
 * The working order with `id` moved to `toIndex`; every id between the old and
 * new position shifts by one, which is what makes the other cuts visibly step
 * aside during a drag. Unknown ids and out-of-range targets are clamped/no-ops
 * so a stale gesture frame can never corrupt the order.
 */
export function movedOrder(order: readonly string[], id: string, toIndex: number): string[] {
  'worklet';
  const from = order.indexOf(id);
  if (from === -1) return [...order];
  const next: string[] = [];
  for (const existing of order) {
    if (existing !== id) next.push(existing);
  }
  const clamped = Math.min(Math.max(toIndex, 0), next.length);
  next.splice(clamped, 0, id);
  return next;
}

/** Total height the absolute-positioned grid needs to reserve in layout. */
export function gridHeight(slotCount: number, spec: ReorderGridSpec): number {
  const rows = Math.ceil(slotCount / spec.columns);
  if (rows <= 0) return 0;
  return rows * spec.cellHeight + (rows - 1) * spec.gap;
}
