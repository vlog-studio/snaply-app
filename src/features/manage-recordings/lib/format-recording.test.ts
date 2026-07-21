import { formatRecordingDate } from './format-recording';

describe('formatRecordingDate', () => {
  it('formats a date using the Korean month, day, hour, and minute fields', () => {
    const timestamp = new Date(2026, 6, 20, 15, 4).getTime();
    const formattedDate = formatRecordingDate(timestamp);

    expect(formattedDate).toContain('7월');
    expect(formattedDate).toContain('20일');
    expect(formattedDate).toContain('3:04');
  });
});
