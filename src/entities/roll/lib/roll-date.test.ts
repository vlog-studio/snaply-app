import type { Roll } from '../model/roll';

import { daysInMonth, elapsedDaysInMonth, formatMonthKey, rollMonthKey } from './roll-date';

function makeRoll(overrides: Partial<Roll> = {}): Roll {
  return {
    id: 'roll-1',
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt: new Date(2026, 6, 24, 9, 0).getTime(),
    title: '롤', // 롤
    clipRefs: [],
    ...overrides,
  };
}

describe('rollMonthKey', () => {
  it('files a daily roll under the month of the day it collects', () => {
    expect(rollMonthKey(makeRoll({ dayKey: '2026-06-30' }))).toBe('2026-06');
  });

  it('files a roll without a day key under the month it was created', () => {
    expect(rollMonthKey(makeRoll({ dayKey: undefined }))).toBe('2026-07');
  });
});

describe('formatMonthKey', () => {
  it('prints a month key as an edge print', () => {
    expect(formatMonthKey('2026-07')).toBe('2026.07');
  });
});

describe('daysInMonth', () => {
  it.each([
    ['2026-07', 31],
    ['2026-06', 30],
    ['2026-02', 28],
    ['2024-02', 29],
  ])('counts %s as %i days', (monthKey, expected) => {
    expect(daysInMonth(monthKey)).toBe(expected);
  });
});

describe('elapsedDaysInMonth', () => {
  it('counts a past month as fully elapsed', () => {
    expect(elapsedDaysInMonth('2026-06', '2026-07-24')).toBe(30);
  });

  it('counts the current month up to today', () => {
    expect(elapsedDaysInMonth('2026-07', '2026-07-24')).toBe(24);
  });

  it('counts a future month as not started', () => {
    expect(elapsedDaysInMonth('2026-08', '2026-07-24')).toBe(0);
  });

  it('counts the first day of a month as one elapsed day', () => {
    expect(elapsedDaysInMonth('2026-07', '2026-07-01')).toBe(1);
  });
});
