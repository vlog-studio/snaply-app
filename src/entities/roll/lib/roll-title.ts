import { toDayKey } from '../model/day-key';

/**
 * Longest a hand-given roll name may be. The new-roll sheet caps its input at
 * the same value, so the two never disagree about what will be saved.
 */
export const ManualRollTitleMaxLength = 20;

/**
 * The title a hand-made roll is saved with.
 *
 * Naming is optional by design: demanding a name is friction at exactly the
 * moment the user is collecting, so a blank one becomes `묶음 07-27` — the day
 * the roll was made. Whitespace-only counts as blank.
 *
 * A name past the cap is cut rather than refused. The sheet already caps what
 * can be typed, so an over-long value only arrives from a paste or a stale
 * caller, and neither is worth failing a roll creation over.
 */
export function manualRollTitle(title: string | undefined, createdAt: number): string {
  const trimmed = title?.trim() ?? '';
  if (trimmed.length === 0) return `묶음 ${toDayKey(createdAt).slice(5)}`; // 묶음
  return trimmed.slice(0, ManualRollTitleMaxLength);
}
