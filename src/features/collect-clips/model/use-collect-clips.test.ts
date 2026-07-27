import { renderHook } from '@testing-library/react-native';

import type { Roll } from '@/entities/roll';

import { useCollectClips } from './use-collect-clips';

let mockRolls: Roll[];
const mockAddClipToRoll = jest.fn();
const mockRemoveClipFromRoll = jest.fn();
// Stands in for the entity's roll creation: records the input and puts the
// roll it would have stored where `getRollById` can find it.
const mockCreateManualRoll = jest.fn((input: { title?: string }) => {
  const roll = makeRoll('manual-1', { type: 'free', collectionRule: 'manual' });
  roll.title = input.title?.trim() || '\uBB36\uC74C 07-27'; // 묶음 07-27
  mockRolls = [...mockRolls, roll];
  return roll;
});

// Mocked at the entity's Public API: this hook's contract is which membership
// writes it issues, and the guard it applies before issuing them.
jest.mock('@/entities/roll', () => ({
  getRollById: (id: string) => mockRolls.find((roll) => roll.id === id),
  useCreateManualRoll: () => mockCreateManualRoll,
  useAddClipToRoll: () => mockAddClipToRoll,
  useRemoveClipFromRoll: () => mockRemoveClipFromRoll,
}));

function makeRoll(id: string, overrides: Partial<Roll> = {}): Roll {
  return {
    id,
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt: 1,
    title: `${id} \uB864`, // 롤
    clipRefs: [],
    ...overrides,
  };
}

function refs(...clipIds: string[]) {
  return clipIds.map((clipId, order) => ({ clipId, order }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRolls = [];
});

describe('useCollectClips', () => {
  describe('bundleIntoNewRoll', () => {
    it('makes a roll and puts every selected cut into it', async () => {
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.bundleIntoNewRoll('\uB178\uC744 \uBAA8\uC74C', ['clip-1', 'clip-2']); // 노을 모음

      expect(outcome).toEqual({
        rollId: 'manual-1',
        title: '\uB178\uC744 \uBAA8\uC74C', // 노을 모음
        changed: 2,
      });
      expect(mockAddClipToRoll.mock.calls).toEqual([
        ['manual-1', 'clip-1'],
        ['manual-1', 'clip-2'],
      ]);
    });

    it('reports the name the roll ended up with when none was given', async () => {
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.bundleIntoNewRoll(undefined, ['clip-1']);

      expect(mockCreateManualRoll).toHaveBeenCalledWith({ title: undefined });
      expect(outcome?.title).toBe('\uBB36\uC74C 07-27'); // 묶음 07-27
    });

    it('makes nothing out of nothing', async () => {
      const { result } = await renderHook(() => useCollectClips());

      expect(result.current.bundleIntoNewRoll('\uBE48 \uB864', [])).toBeUndefined(); // 빈 롤
      expect(mockCreateManualRoll).not.toHaveBeenCalled();
      expect(mockAddClipToRoll).not.toHaveBeenCalled();
    });
  });

  describe('addClipsToRoll', () => {
    it('adds every cut the roll does not already hold', async () => {
      mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.addClipsToRoll('roll-a', ['clip-1', 'clip-2', 'clip-3']);

      expect(outcome).toEqual({ changed: 2, frozen: false });
      expect(mockAddClipToRoll.mock.calls).toEqual([
        ['roll-a', 'clip-2'],
        ['roll-a', 'clip-3'],
      ]);
    });

    it('counts a cut repeated inside one batch once', async () => {
      mockRolls = [makeRoll('roll-a')];
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.addClipsToRoll('roll-a', ['clip-1', 'clip-1']);

      expect(outcome.changed).toBe(1);
      expect(mockAddClipToRoll).toHaveBeenCalledTimes(1);
    });

    it.each(['developing', 'developed'] as const)(
      'refuses a %s roll without writing anything',
      async (status) => {
        mockRolls = [makeRoll('roll-a', { status })];
        const { result } = await renderHook(() => useCollectClips());

        const outcome = result.current.addClipsToRoll('roll-a', ['clip-1']);

        expect(outcome).toEqual({ changed: 0, frozen: true });
        expect(mockAddClipToRoll).not.toHaveBeenCalled();
      },
    );

    it('does nothing for a roll that no longer exists', async () => {
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.addClipsToRoll('roll-gone', ['clip-1']);

      expect(outcome).toEqual({ changed: 0, frozen: false });
      expect(mockAddClipToRoll).not.toHaveBeenCalled();
    });
  });

  describe('removeClipsFromRoll', () => {
    it('removes only the cuts the roll holds', async () => {
      mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1', 'clip-2') })];
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.removeClipsFromRoll('roll-a', ['clip-2', 'clip-9']);

      expect(outcome).toEqual({ changed: 1, frozen: false });
      expect(mockRemoveClipFromRoll.mock.calls).toEqual([['roll-a', 'clip-2']]);
    });

    it('refuses a developed roll — its reel is finished', async () => {
      mockRolls = [
        makeRoll('roll-a', {
          status: 'developed',
          clipRefs: refs('clip-1'),
          reel: { clipRefs: refs('clip-1'), developedAt: 2 },
        }),
      ];
      const { result } = await renderHook(() => useCollectClips());

      const outcome = result.current.removeClipsFromRoll('roll-a', ['clip-1']);

      expect(outcome).toEqual({ changed: 0, frozen: true });
      expect(mockRemoveClipFromRoll).not.toHaveBeenCalled();
    });
  });
});
