import {
  getCaptureMoodLabel,
  normalizeCaptureDuration,
  normalizeCaptureMood,
  type CaptureMood,
} from './capture-options';

describe('capture options', () => {
  describe('normalizeCaptureMood', () => {
    it.each<CaptureMood>(['hip', 'lovely', 'energy'])(
      'keeps the supported mood "%s"',
      (mood) => {
        expect(normalizeCaptureMood(mood)).toBe(mood);
      },
    );

    it.each([undefined, '', 'calm', 'HIP'])(
      'falls back to hip for an unsupported value: %s',
      (value) => {
        expect(normalizeCaptureMood(value)).toBe('hip');
      },
    );
  });

  describe('normalizeCaptureDuration', () => {
    it('keeps the supported five-second duration', () => {
      expect(normalizeCaptureDuration('5')).toBe(5);
    });

    it.each([undefined, '', '3', '4', '05'])(
      'falls back to three seconds for any other value: %s',
      (value) => {
        expect(normalizeCaptureDuration(value)).toBe(3);
      },
    );
  });

  it.each<[CaptureMood, string]>([
    ['hip', '\uD799\uD558\uAC8C'],
    ['lovely', '\uB7EC\uBE14\uB9AC\uD558\uAC8C'],
    ['energy', '\uC2E0\uB098\uAC8C'],
  ])('returns the label for the %s mood', (mood, label) => {
    expect(getCaptureMoodLabel(mood)).toBe(label);
  });
});
