import {
  formatRecordingDate,
  formatRecordingDay,
  formatRecordingTime,
  recordingDayKey,
} from './format-recording';

describe('formatRecordingDate', () => {
  it('formats a date using the Korean month, day, hour, and minute fields', () => {
    const timestamp = new Date(2026, 6, 20, 15, 4).getTime();
    const formattedDate = formatRecordingDate(timestamp);

    expect(formattedDate).toContain('7월');
    expect(formattedDate).toContain('20일');
    expect(formattedDate).toContain('3:04');
  });
});

describe('formatRecordingTime', () => {
  it('formats only the time of day', () => {
    const timestamp = new Date(2026, 6, 20, 15, 4).getTime();
    const formatted = formatRecordingTime(timestamp);

    expect(formatted).toContain('3:04');
    expect(formatted).not.toContain('7월');
  });
});

describe('recordingDayKey', () => {
  it('produces the same key for two times on the same calendar day', () => {
    const morning = new Date(2026, 6, 20, 9, 0).getTime();
    const evening = new Date(2026, 6, 20, 23, 30).getTime();

    expect(recordingDayKey(morning)).toBe(recordingDayKey(evening));
  });

  it('produces different keys for different days', () => {
    const dayOne = new Date(2026, 6, 20, 12, 0).getTime();
    const dayTwo = new Date(2026, 6, 21, 12, 0).getTime();

    expect(recordingDayKey(dayOne)).not.toBe(recordingDayKey(dayTwo));
  });
});

describe('formatRecordingDay', () => {
  const fixedNow = new Date(2026, 6, 24, 10, 0).getTime();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('labels today as 오늘', () => {
    expect(formatRecordingDay(new Date(2026, 6, 24, 8, 0).getTime())).toBe('오늘');
  });

  it('labels yesterday as 어제', () => {
    expect(formatRecordingDay(new Date(2026, 6, 23, 22, 0).getTime())).toBe('어제');
  });

  it('labels older days with a full Korean date', () => {
    const label = formatRecordingDay(new Date(2026, 6, 20, 12, 0).getTime());

    expect(label).toContain('7월');
    expect(label).toContain('20일');
    expect(label).not.toBe('오늘');
    expect(label).not.toBe('어제');
  });
});
