/**
 * Formats an epoch-millisecond timestamp as a local `YYYY-MM-DD` day key. Local
 * (not UTC) components are used deliberately so a "daily roll" boundary matches
 * the user's own midnight — the moment they perceive a new day starting — rather
 * than UTC's. This key is the stable identity of a daily roll.
 */
export function toDayKey(epochMs: number): string {
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
