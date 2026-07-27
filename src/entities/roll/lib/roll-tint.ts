/**
 * The darkroom tints a roll can carry. A roll has no stored color: its tint is
 * derived from its id so the same roll reads as the same color everywhere it
 * appears (contact-strip dot, cover spine, cut sheet, delete confirmation).
 * Deriving instead of storing leaves the roll schema untouched and gives every
 * already-persisted roll a color immediately.
 *
 * Six tints means rolls repeat colors past the sixth. That is accepted: the
 * tint is a secondary signal and a roll's name is always shown next to it.
 */
export const RollTints = [
  '#EA5E38', // ember — safelight
  '#82D6CE', // lumen — lightbox
  '#E7A24A', // amber — film base
  '#9A86C9', // iris
  '#7FC9A0', // moss
  '#D98AA0', // rose
] as const;

export type RollTint = (typeof RollTints)[number];

/**
 * Today's roll is always the safelight ember, whatever its id hashes to, so
 * "today" is instantly readable among the other rolls. Callers that know which
 * roll is today's apply this instead of {@link rollTint}.
 */
export const TodayRollTint: RollTint = RollTints[0];

/**
 * Maps a roll id onto a fixed tint. Deterministic: the same id always yields
 * the same tint, independent of list position or how many rolls exist — unlike
 * cycling a palette by index, which reassigns every color when a roll is added.
 *
 * A character-code sum is enough to spread ids across six buckets. Consecutive
 * daily rolls (`daily-2026-07-23`, `daily-2026-07-24`) land on adjacent tints,
 * which reads as a gradient down the shelf rather than as a collision.
 */
export function rollTint(rollId: string): RollTint {
  let hash = 0;
  for (let index = 0; index < rollId.length; index += 1) {
    hash = (hash + rollId.charCodeAt(index)) >>> 0;
  }
  return RollTints[hash % RollTints.length];
}
