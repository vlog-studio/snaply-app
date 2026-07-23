import { toDayKey } from './day-key';

describe('toDayKey', () => {
  it('formats a timestamp as a zero-padded local YYYY-MM-DD key', () => {
    // 2026-03-09 in the local zone (constructed from local components).
    const timestamp = new Date(2026, 2, 9, 14, 30).getTime();
    expect(toDayKey(timestamp)).toBe('2026-03-09');
  });

  it('gives two timestamps on the same local day the same key', () => {
    const morning = new Date(2026, 6, 23, 0, 1).getTime();
    const night = new Date(2026, 6, 23, 23, 59).getTime();
    expect(toDayKey(morning)).toBe(toDayKey(night));
  });

  it('gives timestamps across a local midnight boundary different keys', () => {
    const beforeMidnight = new Date(2026, 6, 23, 23, 59).getTime();
    const afterMidnight = new Date(2026, 6, 24, 0, 0).getTime();
    expect(toDayKey(beforeMidnight)).toBe('2026-07-23');
    expect(toDayKey(afterMidnight)).toBe('2026-07-24');
  });
});
