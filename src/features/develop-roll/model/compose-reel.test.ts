import type { Clip } from '@/entities/clip';
import type { Roll } from '@/entities/roll';

import { composeReel } from './compose-reel';

function makeClip(id: string, mood?: Clip['mood']): Clip {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec: 3,
    mood,
    capturedAt: 1_753_200_000_000,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
  };
}

function makeRoll(clipRefs: Roll['clipRefs']): Roll {
  return {
    id: 'daily-2026-07-23',
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt: 1_753_200_000_000,
    dayKey: '2026-07-23',
    title: '2026-07-23 데일리 롤',
    clipRefs,
  };
}

describe('composeReel', () => {
  it('orders the reel by clip-reference order', () => {
    const roll = makeRoll([
      { clipId: 'c3', order: 2 },
      { clipId: 'c1', order: 0 },
      { clipId: 'c2', order: 1 },
    ]);

    const reel = composeReel(roll, [makeClip('c1'), makeClip('c2'), makeClip('c3')], 1000);

    expect(reel.clipRefs.map((ref) => ref.clipId)).toEqual(['c1', 'c2', 'c3']);
    expect(reel.developedAt).toBe(1000);
  });

  it('picks BGM from the dominant clip mood', () => {
    const roll = makeRoll([
      { clipId: 'c1', order: 0 },
      { clipId: 'c2', order: 1 },
      { clipId: 'c3', order: 2 },
    ]);

    const reel = composeReel(
      roll,
      [makeClip('c1', 'energy'), makeClip('c2', 'energy'), makeClip('c3', 'hip')],
      1000,
    );

    expect(reel.bgm).toBe('darkroom-energy');
  });

  it('falls back to ambient BGM when no clip has a mood', () => {
    const roll = makeRoll([{ clipId: 'c1', order: 0 }]);

    const reel = composeReel(roll, [makeClip('c1')], 1000);

    expect(reel.bgm).toBe('darkroom-ambient');
  });

  it('cuts fast for longer rolls and fades for short ones', () => {
    const shortRoll = makeRoll([
      { clipId: 'c1', order: 0 },
      { clipId: 'c2', order: 1 },
    ]);
    const longRoll = makeRoll(
      Array.from({ length: 4 }, (_, index) => ({ clipId: `c${index}`, order: index })),
    );

    expect(composeReel(shortRoll, [makeClip('c1'), makeClip('c2')], 1).transition).toBe('fade');
    expect(
      composeReel(longRoll, [makeClip('c0'), makeClip('c1'), makeClip('c2'), makeClip('c3')], 1)
        .transition,
    ).toBe('cut');
  });
});
