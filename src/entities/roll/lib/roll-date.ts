import { toDayKey } from '../model/day-key';
import type { Roll } from '../model/roll';

/**
 * The day a roll stands for, as `YYYY-MM-DD`.
 *
 * A daily roll answers this with its own `dayKey` — the day it collects. A roll
 * without one (a roll assembled by hand from clips spanning several days) has
 * no single day it represents, so it answers with the day it was made.
 *
 * Derived rather than stored: it can never drift from the fields it comes from,
 * and every place the cabinet files or sorts a roll by date reads it, so a
 * hand-made roll is never left without an answer.
 */
export function rollDate(roll: Roll): string {
  return roll.dayKey ?? toDayKey(roll.createdAt);
}

/** The calendar month a roll is filed under, as `YYYY-MM`. */
export function rollMonthKey(roll: Roll): string {
  return rollDate(roll).slice(0, 7);
}

/**
 * The span a set of captured days covers, for an edge print: `07-18~07-24`, or
 * a bare `07-18` when they all fall on one day. Undefined when there is nothing
 * to span.
 *
 * A daily roll prints its own date; a hand-made roll's title is a name instead,
 * so the edge is where its dates go. The year is left off — the shelf section
 * the roll sits in already carries it, and an edge print has room for little.
 */
export function formatDayRange(dayKeys: readonly string[]): string | undefined {
  if (dayKeys.length === 0) return undefined;
  let first = dayKeys[0];
  let last = dayKeys[0];
  for (const dayKey of dayKeys) {
    if (dayKey < first) first = dayKey;
    if (dayKey > last) last = dayKey;
  }
  const from = first.slice(5);
  const to = last.slice(5);
  return from === to ? from : `${from}~${to}`;
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
