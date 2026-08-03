import {
  formatDateTime,
  formatDayHeading,
  formatDuration,
  formatSeconds,
  relativeDayLabel,
} from './datetime';

describe('formatDateTime', () => {
  it('formats a date using the Korean month, day, hour, and minute fields', () => {
    const timestamp = new Date(2026, 6, 20, 15, 4).getTime();
    const formatted = formatDateTime(timestamp);

    expect(formatted).toContain('7월');
    expect(formatted).toContain('20일');
    expect(formatted).toContain('3:04');
  });
});

describe('relativeDayLabel', () => {
  const now = new Date(2026, 6, 24, 10, 0).getTime();

  it.each([
    [new Date(2026, 6, 24, 8, 0).getTime(), '오늘'],
    [new Date(2026, 6, 23, 22, 0).getTime(), '어제'],
  ])('names the day as %s', (timestamp, expected) => {
    expect(relativeDayLabel(timestamp, now)).toBe(expected);
  });

  it('leaves an older day unnamed, so its heading can print the date alone', () => {
    expect(relativeDayLabel(new Date(2026, 6, 20, 12, 0).getTime(), now)).toBeUndefined();
  });

  it('names the day against the injected clock rather than the real one', () => {
    const capturedAt = new Date(2026, 6, 20, 12, 0).getTime();

    expect(relativeDayLabel(capturedAt, new Date(2026, 6, 20, 23, 0).getTime())).toBe('오늘');
    expect(relativeDayLabel(capturedAt, new Date(2026, 6, 21, 1, 0).getTime())).toBe('어제');
  });

  it('reads the clock when no time is given', () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
    try {
      expect(relativeDayLabel(new Date(2026, 6, 24, 8, 0).getTime())).toBe('오늘');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('formatDayHeading', () => {
  const now = new Date(2026, 6, 24, 10, 0).getTime();

  it('labels today as 오늘', () => {
    expect(formatDayHeading(new Date(2026, 6, 24, 8, 0).getTime(), now)).toBe('오늘');
  });

  it('labels yesterday as 어제', () => {
    expect(formatDayHeading(new Date(2026, 6, 23, 22, 0).getTime(), now)).toBe('어제');
  });

  it('labels older days with a full Korean date', () => {
    const label = formatDayHeading(new Date(2026, 6, 20, 12, 0).getTime(), now);

    expect(label).toContain('7월');
    expect(label).toContain('20일');
    expect(label).not.toBe('오늘');
    expect(label).not.toBe('어제');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [72, '1:12'],
  ])('formats %i seconds as %s', (totalSec, expected) => {
    expect(formatDuration(totalSec)).toBe(expected);
  });
});

describe('formatSeconds', () => {
  const sec = '초'; // 초
  it.each([
    [0, `0${sec}`],
    [4, `4${sec}`],
    [4.5, `4.5${sec}`],
    // A sum of half-second trims can drift; a label never shows the drift.
    [4.499_999_9, `4.5${sec}`],
    [12.04, `12${sec}`],
  ])('formats %p as %s', (totalSec, expected) => {
    expect(formatSeconds(totalSec)).toBe(expected);
  });
});
