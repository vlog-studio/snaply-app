// Formatters are built once at module load and reused. Constructing an
// `Intl.DateTimeFormat` costs far more than formatting with one, and these run
// per film frame and per list row — a contact strip formats every frame it
// draws, so a per-call constructor showed up as scroll cost.
const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const fullDateFormat = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const DayMs = 24 * 60 * 60 * 1000;

/** Month, day, and time of day: `7월 20일 오후 3:04`. */
export function formatDateTime(epochMs: number): string {
  return dateTimeFormat.format(new Date(epochMs));
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * `오늘` or `어제` for the two days that have a name, `undefined` for every
 * other day. Separated from the full date because a heading showing both a name
 * and a date says the same thing twice.
 *
 * `now` is injectable so a caller that already knows which day it is can stay
 * pure, matching `elapsedDaysInMonth` and `ensureDailyRoll`. The default reads
 * the clock, so callers that have no better answer need not invent one.
 */
export function relativeDayLabel(epochMs: number, now: number = Date.now()): string | undefined {
  const today = startOfDay(new Date(now));
  const target = startOfDay(new Date(epochMs));

  if (target === today) return '오늘';
  if (target === today - DayMs) return '어제';
  return undefined;
}

/**
 * Human day heading, relative to `now` where that reads naturally and a full
 * date otherwise.
 */
export function formatDayHeading(epochMs: number, now: number = Date.now()): string {
  return relativeDayLabel(epochMs, now) ?? fullDateFormat.format(new Date(epochMs));
}

/**
 * A short length as a label: `4초`, `4.5초`.
 *
 * Trims are set at half seconds, so a cut's or a movie's length is not always
 * whole — but most are, and `4.0초` reads as a measurement rather than a
 * duration. For anything that can pass a minute, use {@link formatDuration}.
 */
export function formatSeconds(totalSec: number): string {
  const rounded = Math.round(totalSec * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}초`;
}

/** A duration in seconds as `m:ss`, for a movie length or a badge. */
export function formatDuration(totalSec: number): string {
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
