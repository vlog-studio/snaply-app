import { act, renderHook } from '@testing-library/react-native';

import type { Roll } from '@/entities/roll';

import { useDevelopRoll } from './use-develop-roll';

const mockSetRollStatus = jest.fn();
const mockSetRollReel = jest.fn();
const mockGetRollById = jest.fn();
const mockGetClipsByIds = jest.fn();

jest.mock('@/entities/roll', () => ({
  getRollById: (id: string) => mockGetRollById(id),
  useSetRollStatus: () => mockSetRollStatus,
  useSetRollReel: () => mockSetRollReel,
}));
jest.mock('@/entities/clip', () => ({
  getClipsByIds: (ids: string[]) => mockGetClipsByIds(ids),
}));

const roll: Roll = {
  id: 'daily-2026-07-23',
  type: 'daily',
  collectionRule: 'all-day',
  targetOrientation: 'portrait',
  status: 'undeveloped',
  createdAt: 1_753_200_000_000,
  dayKey: '2026-07-23',
  title: '2026-07-23 데일리 롤',
  clipRefs: [
    { clipId: 'c1', order: 0 },
    { clipId: 'c2', order: 1 },
  ],
};

const clips = [
  { id: 'c1', uri: 'file:///c1.mp4', durationSec: 3, capturedAt: 1, width: 1, height: 2, orientation: 'portrait', tags: [] },
  { id: 'c2', uri: 'file:///c2.mp4', durationSec: 3, capturedAt: 1, width: 1, height: 2, orientation: 'portrait', tags: [] },
];

describe('useDevelopRoll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRollById.mockReturnValue(roll);
    mockGetClipsByIds.mockReturnValue(clips);
  });

  it('composes and persists a reel and marks the roll developed', async () => {
    const { result } = await renderHook(() => useDevelopRoll());

    let ok = false;
    await act(async () => {
      ok = result.current.develop('daily-2026-07-23');
    });

    expect(ok).toBe(true);
    expect(mockSetRollStatus).toHaveBeenNthCalledWith(1, 'daily-2026-07-23', 'developing');
    expect(mockSetRollReel).toHaveBeenCalledWith(
      'daily-2026-07-23',
      expect.objectContaining({ clipRefs: roll.clipRefs }),
    );
    expect(mockSetRollStatus).toHaveBeenLastCalledWith('daily-2026-07-23', 'developed');
    expect(result.current.error).toBeNull();
  });

  it('fails without composing when the roll has no clips', async () => {
    mockGetClipsByIds.mockReturnValue([]);
    const { result } = await renderHook(() => useDevelopRoll());

    let ok = true;
    await act(async () => {
      ok = result.current.develop('daily-2026-07-23');
    });

    expect(ok).toBe(false);
    expect(mockSetRollReel).not.toHaveBeenCalled();
    expect(mockSetRollStatus).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });

  it('fails when the roll does not exist', async () => {
    mockGetRollById.mockReturnValue(undefined);
    const { result } = await renderHook(() => useDevelopRoll());

    let ok = true;
    await act(async () => {
      ok = result.current.develop('missing');
    });

    expect(ok).toBe(false);
    expect(mockSetRollReel).not.toHaveBeenCalled();
  });
});
