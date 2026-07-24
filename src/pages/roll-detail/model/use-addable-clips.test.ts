import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import type { Roll } from '@/entities/roll';

import { useAddableClips } from './use-addable-clips';

let mockClips: Clip[];

jest.mock('@/entities/clip', () => ({
  useClips: () => mockClips,
}));

function makeClip(id: string, capturedAt: number): Clip {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec: 3,
    capturedAt,
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
    title: '2026-07-23 데일리 롤', // 데일리 롤
    clipRefs,
  };
}

beforeEach(() => {
  mockClips = [];
});

describe('useAddableClips', () => {
  it('returns nothing when the roll is missing', async () => {
    mockClips = [makeClip('clip-1', 100)];

    const { result } = await renderHook(() => useAddableClips(undefined));

    expect(result.current).toEqual([]);
  });

  it('excludes clips already referenced by the roll', async () => {
    mockClips = [makeClip('clip-1', 100), makeClip('clip-2', 200), makeClip('clip-3', 300)];
    const roll = makeRoll([{ clipId: 'clip-2', order: 0 }]);

    const { result } = await renderHook(() => useAddableClips(roll));

    expect(result.current.map((clip) => clip.id)).toEqual(['clip-3', 'clip-1']);
  });

  it('sorts candidates newest first', async () => {
    mockClips = [makeClip('old', 100), makeClip('newest', 300), makeClip('mid', 200)];
    const roll = makeRoll([]);

    const { result } = await renderHook(() => useAddableClips(roll));

    expect(result.current.map((clip) => clip.id)).toEqual(['newest', 'mid', 'old']);
  });
});
