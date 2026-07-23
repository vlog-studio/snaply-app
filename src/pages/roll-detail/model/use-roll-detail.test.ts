import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import type { Roll } from '@/entities/roll';

import { useRollDetail } from './use-roll-detail';

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

beforeEach(() => {
  mockRoll = undefined;
  mockClips = [];
});

describe('useRollDetail', () => {
  it('returns no clips and cannot develop when the roll is missing', async () => {
    const { result } = await renderHook(() => useRollDetail('nope'));

    expect(result.current.roll).toBeUndefined();
    expect(result.current.clips).toEqual([]);
    expect(result.current.canDevelop).toBe(false);
  });

  it('resolves references to clips ordered by the reference order', async () => {
    mockClips = [makeClip('clip-1'), makeClip('clip-2'), makeClip('clip-3')];
    mockRoll = makeRoll([
      { clipId: 'clip-3', order: 2 },
      { clipId: 'clip-1', order: 0 },
      { clipId: 'clip-2', order: 1 },
    ]);

    const { result } = await renderHook(() => useRollDetail('daily-2026-07-23'));

    expect(result.current.clips.map((clip) => clip.id)).toEqual(['clip-1', 'clip-2', 'clip-3']);
    expect(result.current.canDevelop).toBe(true);
  });

  it('skips references whose clip is no longer in the archive', async () => {
    mockClips = [makeClip('clip-1')];
    mockRoll = makeRoll([
      { clipId: 'clip-1', order: 0 },
      { clipId: 'deleted', order: 1 },
    ]);

    const { result } = await renderHook(() => useRollDetail('daily-2026-07-23'));

    expect(result.current.clips.map((clip) => clip.id)).toEqual(['clip-1']);
  });

  it('cannot develop an empty roll', async () => {
    mockRoll = makeRoll([]);

    const { result } = await renderHook(() => useRollDetail('daily-2026-07-23'));

    expect(result.current.clips).toEqual([]);
    expect(result.current.canDevelop).toBe(false);
  });
});
