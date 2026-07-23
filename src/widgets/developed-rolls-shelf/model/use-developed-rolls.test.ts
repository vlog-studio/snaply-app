import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import type { Reel, Roll } from '@/entities/roll';

import { formatReelLength, useDevelopedRolls } from './use-developed-rolls';

let mockRolls: Roll[];
let mockClips: Clip[];

jest.mock('@/entities/clip', () => ({
  useClips: () => mockClips,
}));
jest.mock('@/entities/roll', () => ({
  useRolls: () => mockRolls,
}));

function makeClip(id: string, durationSec: number): Clip {
  return {
    id,
    uri: `file:///${id}.mp4`,
    durationSec,
    capturedAt: 1,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
  };
}

function makeRoll(id: string, status: Roll['status'], reel?: Reel): Roll {
  return {
    id,
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status,
    createdAt: 1,
    dayKey: id,
    title: `${id} 롤`,
    clipRefs: reel?.clipRefs ?? [],
    reel,
  };
}

beforeEach(() => {
  mockRolls = [];
  mockClips = [];
});

describe('useDevelopedRolls', () => {
  it('excludes undeveloped rolls and rolls without a reel', async () => {
    mockRolls = [
      makeRoll('a', 'undeveloped'),
      makeRoll('b', 'developing'),
      makeRoll('c', 'developed', undefined),
    ];

    const { result } = await renderHook(() => useDevelopedRolls());

    expect(result.current).toEqual([]);
  });

  it('lists developed rolls newest-developed first with clip count and total length', async () => {
    mockClips = [makeClip('c1', 3), makeClip('c2', 5)];
    const older: Reel = {
      clipRefs: [{ clipId: 'c1', order: 0 }],
      developedAt: 1000,
    };
    const newer: Reel = {
      clipRefs: [
        { clipId: 'c1', order: 0 },
        { clipId: 'c2', order: 1 },
      ],
      developedAt: 2000,
    };
    mockRolls = [makeRoll('older', 'developed', older), makeRoll('newer', 'developed', newer)];

    const { result } = await renderHook(() => useDevelopedRolls());

    expect(result.current.map((roll) => roll.id)).toEqual(['newer', 'older']);
    expect(result.current[0]).toMatchObject({ clipCount: 2, totalSec: 8 });
    expect(result.current[1]).toMatchObject({ clipCount: 1, totalSec: 3 });
  });
});

describe('formatReelLength', () => {
  it.each([
    [8, '0:08'],
    [60, '1:00'],
    [75, '1:15'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatReelLength(seconds)).toBe(expected);
  });
});
