import { RollTints, TodayRollTint, rollTint } from './roll-tint';

describe('rollTint', () => {
  it('returns a tint from the palette for any id', () => {
    expect(RollTints).toContain(rollTint('daily-2026-07-23'));
    expect(RollTints).toContain(rollTint(''));
    expect(RollTints).toContain(rollTint('manual-1753600000000'));
  });

  it('is deterministic for the same id', () => {
    expect(rollTint('daily-2026-07-23')).toBe(rollTint('daily-2026-07-23'));
  });

  it('does not depend on how many other rolls exist', () => {
    const ids = ['daily-2026-07-21', 'daily-2026-07-22', 'daily-2026-07-23'];
    const before = ids.map(rollTint);

    // Adding a roll must not reassign anyone else's color — the failure mode of
    // cycling a palette by list position.
    const after = ['manual-1753600000000', ...ids].map(rollTint).slice(1);

    expect(after).toEqual(before);
  });

  it('gives consecutive daily rolls different tints', () => {
    expect(rollTint('daily-2026-07-23')).not.toBe(rollTint('daily-2026-07-24'));
  });

  it('uses the safelight ember as the reserved today tint', () => {
    expect(TodayRollTint).toBe(RollTints[0]);
  });
});
