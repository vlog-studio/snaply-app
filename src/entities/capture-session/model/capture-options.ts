export type CaptureMood = 'hip' | 'lovely' | 'energy';
export type CaptureDuration = 3 | 5;

const moodLabels: Record<CaptureMood, string> = {
  hip: '힙하게',
  lovely: '러블리하게',
  energy: '신나게',
};

export function normalizeCaptureMood(value: string | undefined): CaptureMood {
  if (value === 'lovely' || value === 'energy') return value;
  return 'hip';
}

export function normalizeCaptureDuration(value: string | undefined): CaptureDuration {
  return value === '5' ? 5 : 3;
}

export function getCaptureMoodLabel(mood: CaptureMood) {
  return moodLabels[mood];
}
