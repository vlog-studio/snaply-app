import { formatRecordingDate, formatRecordingFileSize } from './format-recording';

describe('recording formatters', () => {
  describe('formatRecordingFileSize', () => {
    it.each([
      [0, '1KB'],
      [512, '1KB'],
      [1_536, '2KB'],
      [1_048_576, '1.0MB'],
      [1_572_864, '1.5MB'],
    ])('formats %i bytes as %s', (bytes, formattedSize) => {
      expect(formatRecordingFileSize(bytes)).toBe(formattedSize);
    });
  });

  it('formats a date using the Korean month, day, hour, and minute fields', () => {
    const timestamp = new Date(2026, 6, 20, 15, 4).getTime();
    const formattedDate = formatRecordingDate(timestamp);

    expect(formattedDate).toContain('7\uC6D4');
    expect(formattedDate).toContain('20\uC77C');
    expect(formattedDate).toContain('3:04');
  });
});
