import type { LocalRecording } from '@/shared/lib/recording-files';

import { createClip } from './create-clip';

const recording: LocalRecording = {
  id: 'snaply-1753200000000.mp4',
  uri: 'file:///doc/recordings/snaply-1753200000000.mp4',
  fileName: 'snaply-1753200000000.mp4',
  size: 4096,
  createdAt: 1_753_200_000_000,
};

describe('createClip', () => {
  it('ties the clip id and uri to the recording and defaults to portrait', () => {
    const clip = createClip(recording, { durationSec: 3, mood: 'hip' });

    expect(clip).toMatchObject({
      id: recording.id,
      uri: recording.uri,
      durationSec: 3,
      mood: 'hip',
      capturedAt: recording.createdAt,
      orientation: 'portrait',
      tags: [],
    });
    expect(clip.width).toBeGreaterThan(0);
    expect(clip.height).toBeGreaterThan(clip.width);
  });

  it('leaves mood undefined when not provided', () => {
    const clip = createClip(recording, { durationSec: 5 });

    expect(clip.mood).toBeUndefined();
    expect(clip.durationSec).toBe(5);
  });
});
