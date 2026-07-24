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
 * Stable per-day key used to group clips in the day-grouped archive view.
 * Same calendar day → same key regardless of time of day.
 */
export function recordingDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Human day heading for a group, relative to today ("오늘"/"어제"). */
export function formatRecordingDay(timestamp: number) {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(timestamp));
  const dayMs = 24 * 60 * 60 * 1000;

  if (target === today) return '오늘';
  if (target === today - dayMs) return '어제';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(timestamp));
}
