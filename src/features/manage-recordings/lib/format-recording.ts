export function formatRecordingDate(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

/** Short time-of-day label overlaid on a grid cell, e.g. "오후 3:04". */
export function formatRecordingTime(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * "오늘" or "어제" for the two days that have a name, `undefined` for every
 * other day. Separated from the full date because a heading that shows both a
 * name and a date wants only the name from here — printing "2026년 7월 24일"
 * beside "07-24" says the same thing twice.
 */
export function relativeDayLabel(timestamp: number): string | undefined {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(timestamp));
  const dayMs = 24 * 60 * 60 * 1000;

  if (target === today) return '오늘';
  if (target === today - dayMs) return '어제';
  return undefined;
}

/**
 * Human day heading for a group, relative to today where that reads naturally.
 *
 * Grouping itself is keyed by `toDayKey` (`entities/roll`), the same key a daily
 * roll is identified by, so a day of cuts and the roll that collected it always
 * line up. This function only labels the group a caller already formed.
 */
export function formatRecordingDay(timestamp: number) {
  return (
    relativeDayLabel(timestamp) ??
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(timestamp))
  );
}
