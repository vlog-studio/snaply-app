import { toDayKey } from '../model/day-key';
import type { Roll } from '../model/roll';

/**
 * The calendar month a roll belongs to, as `YYYY-MM`.
 *
 * A daily roll answers this with its own `dayKey` — the day it collects. A roll
 * without one (a roll assembled by hand from clips spanning several days) has
 * no single day it represents, so it is filed under the month it was created:
 * the month the user made it.
 */
export function rollMonthKey(roll: Roll): string {
  return (roll.dayKey ?? toDayKey(roll.createdAt)).slice(0, 7);
}

/** Formats a `YYYY-MM` month key for an edge print: `2026.07`. */
export function formatMonthKey(monthKey: string): string {
  return monthKey.replace('-', '.');
}

/** Number of days in the `YYYY-MM` month. */
export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month, 0).getDate();
}

/**
 * How many days of a month have already happened, relative to a `YYYY-MM-DD`
 * today. A past month has fully elapsed; the current month has elapsed up to
 * today; a future month has not started.
 *
 * Today is passed in rather than read from the clock so callers stay pure — the
 * app already knows which day it is from today's roll.
 */
export function elapsedDaysInMonth(monthKey: string, todayDayKey: string): number {
  const todayMonthKey = todayDayKey.slice(0, 7);
  if (monthKey < todayMonthKey) return daysInMonth(monthKey);
  if (monthKey > todayMonthKey) return 0;
  return Number(todayDayKey.slice(8, 10));
}
