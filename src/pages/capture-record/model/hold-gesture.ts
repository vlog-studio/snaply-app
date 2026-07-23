/**
 * Press-and-hold collect gesture rules (concept §7 "꾹-담기 링").
 * Holds shorter than the threshold are accidental taps: the recording is
 * discarded instead of being collected into today's roll, mirroring the
 * motion.html reference demo (250ms).
 */
export const MIN_COLLECT_HOLD_MS = 250;

export function shouldCollectHold(heldMs: number): boolean {
  return heldMs > MIN_COLLECT_HOLD_MS;
}
