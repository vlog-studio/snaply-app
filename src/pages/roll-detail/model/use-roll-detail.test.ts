import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import type { Roll } from '@/entities/roll';

import { useRollDetail } from './use-roll-detail';

let mockRoll: Roll | undefined;
let mockClips: Clip[];

jest.mock('@/entities/clip', () => ({
  useClips: () => mockClips,
}));
// The date helpers are pure derivations this hook composes, so the real ones
// are kept; only the store read is stubbed.
jest.mock('@/entities/roll', () => ({
  ...jest.requireActual('@/entities/roll'),
  useRollById: () => mockRoll,
}));

function makeClip(id: string, capturedOn = '2026-07-23'): Clip {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec: 3,
    capturedAt: new Date(`${capturedOn}T09:00:00`).getTime(),
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

  describe('dateLabel', () => {
    it('stamps the day a daily roll collects', async () => {
      mockClips = [makeClip('clip-1', '2026-07-18')];
      mockRoll = makeRoll([{ clipId: 'clip-1', order: 0 }]);

      const { result } = await renderHook(() => useRollDetail('daily-2026-07-23'));

      expect(result.current.dateLabel).toBe('2026-07-23');
    });

    it('stamps the span its cuts cover for a roll bundled by hand', async () => {
      mockClips = [makeClip('clip-1', '2026-07-24'), makeClip('clip-2', '2026-07-18')];
      mockRoll = {
        ...makeRoll([
          { clipId: 'clip-1', order: 0 },
          { clipId: 'clip-2', order: 1 },
        ]),
        type: 'free',
        collectionRule: 'manual',
        dayKey: undefined,
      };

      const { result } = await renderHook(() => useRollDetail('manual-1'));

      expect(result.current.dateLabel).toBe('07-18~07-24');
    });

    it('has nothing to stamp for a hand-made roll whose cuts are gone', async () => {
      mockRoll = { ...makeRoll([]), type: 'free', collectionRule: 'manual', dayKey: undefined };

      const { result } = await renderHook(() => useRollDetail('manual-1'));

      expect(result.current.dateLabel).toBeUndefined();
    });
  });
});
