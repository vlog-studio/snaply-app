import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import type { Roll } from '@/entities/roll';

import { useReel } from './use-reel';

let mockRoll: Roll | undefined;
let mockClips: Clip[];

jest.mock('@/entities/clip', () => ({
  useClips: () => mockClips,
}));
jest.mock('@/entities/roll', () => ({
  useRollById: () => mockRoll,
}));

function makeClip(id: string): Clip {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec: 3,
    capturedAt: 1_753_200_000_000,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
  };
}

function makeRoll(reel: Roll['reel']): Roll {
  return {
    id: 'daily-2026-07-23',
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: reel ? 'developed' : 'undeveloped',
    createdAt: 1_753_200_000_000,
    dayKey: '2026-07-23',
    title: '2026-07-23 데일리 롤',
    clipRefs: [],
    reel,
  };
}

beforeEach(() => {
  mockRoll = undefined;
  mockClips = [];
});

describe('useReel', () => {
  it('returns no uris when the roll has no reel yet', async () => {
    mockRoll = makeRoll(undefined);
    mockClips = [makeClip('c1')];

    const { result } = await renderHook(() => useReel('daily-2026-07-23'));

    expect(result.current.uris).toEqual([]);
    expect(result.current.reel).toBeUndefined();
  });

  it('resolves reel clip references to source URIs in reel order', async () => {
    mockClips = [makeClip('c1'), makeClip('c2'), makeClip('c3')];
    mockRoll = makeRoll({
      clipRefs: [
        { clipId: 'c2', order: 1 },
        { clipId: 'c1', order: 0 },
        { clipId: 'c3', order: 2 },
      ],
      bgm: 'darkroom-hip',
      transition: 'cut',
      developedAt: 1000,
    });

    const { result } = await renderHook(() => useReel('daily-2026-07-23'));

    expect(result.current.uris).toEqual([
      'file:///doc/recordings/c1.mp4',
      'file:///doc/recordings/c2.mp4',
      'file:///doc/recordings/c3.mp4',
    ]);
  });

  it('skips reel references whose clip is missing from the archive', async () => {
    mockClips = [makeClip('c1')];
    mockRoll = makeRoll({
      clipRefs: [
        { clipId: 'c1', order: 0 },
        { clipId: 'deleted', order: 1 },
      ],
      developedAt: 1000,
    });

    const { result } = await renderHook(() => useReel('daily-2026-07-23'));

    expect(result.current.uris).toEqual(['file:///doc/recordings/c1.mp4']);
  });
});
