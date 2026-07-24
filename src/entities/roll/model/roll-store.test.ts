import { act, renderHook } from '@testing-library/react-native';

import {
  ensureDailyRoll,
  useAddClipToRoll,
  useRemoveClipFromRoll,
  useReorderRollClips,
  useRollById,
  useRolls,
  useRollStore,
  useSetRollStatus,
  useTodayRoll,
} from './roll-store';

// Mock the persistence backend so no native file system is touched.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

const JULY_23 = new Date(2026, 6, 23, 10, 0).getTime();
const JULY_23_LATER = new Date(2026, 6, 23, 22, 30).getTime();
const JULY_24 = new Date(2026, 6, 24, 9, 0).getTime();

describe('roll store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The store is a module-level singleton; reset it so tests stay independent.
    useRollStore.setState({ rolls: [], todayRollId: null });
  });

  describe('ensureDailyRoll', () => {
    it('creates an undeveloped daily roll for the day when none exists', () => {
      const roll = ensureDailyRoll(JULY_23);

      expect(roll).toMatchObject({
        id: 'daily-2026-07-23',
        type: 'daily',
        collectionRule: 'all-day',
        targetOrientation: 'portrait',
        status: 'undeveloped',
        dayKey: '2026-07-23',
        clipRefs: [],
      });
      expect(useRollStore.getState().rolls).toHaveLength(1);
    });

    it('reuses the same roll for a later time on the same local day', () => {
      const first = ensureDailyRoll(JULY_23);
      const second = ensureDailyRoll(JULY_23_LATER);

      expect(second.id).toBe(first.id);
      expect(useRollStore.getState().rolls).toHaveLength(1);
    });

    it('creates a separate roll for the next day', () => {
      ensureDailyRoll(JULY_23);
      ensureDailyRoll(JULY_24);

      expect(useRollStore.getState().rolls.map((roll) => roll.dayKey)).toEqual([
        '2026-07-23',
        '2026-07-24',
      ]);
    });
  });

  describe('membership', () => {
    it('appends clip references with increasing order and dedupes by clip id', async () => {
      ensureDailyRoll(JULY_23);
      const rollId = 'daily-2026-07-23';

      const { result } = await renderHook(() => ({
        addClipToRoll: useAddClipToRoll(),
        roll: useRollById(rollId),
      }));

      await act(async () => result.current.addClipToRoll(rollId, 'clip-1'));
      await act(async () => result.current.addClipToRoll(rollId, 'clip-2'));
      await act(async () => result.current.addClipToRoll(rollId, 'clip-1'));

      expect(result.current.roll?.clipRefs).toEqual([
        { clipId: 'clip-1', order: 0 },
        { clipId: 'clip-2', order: 1 },
      ]);
    });

    it('removes a clip reference from the roll', async () => {
      ensureDailyRoll(JULY_23);
      const rollId = 'daily-2026-07-23';

      const { result } = await renderHook(() => ({
        addClipToRoll: useAddClipToRoll(),
        removeClipFromRoll: useRemoveClipFromRoll(),
        roll: useRollById(rollId),
      }));

      await act(async () => result.current.addClipToRoll(rollId, 'clip-1'));
      await act(async () => result.current.addClipToRoll(rollId, 'clip-2'));
      await act(async () => result.current.removeClipFromRoll(rollId, 'clip-1'));

      expect(result.current.roll?.clipRefs.map((ref) => ref.clipId)).toEqual(['clip-2']);
    });
  });

  describe('reorderRollClips', () => {
    async function setUpRollWithClips(clipIds: string[]) {
      ensureDailyRoll(JULY_23);
      const rollId = 'daily-2026-07-23';

      const { result } = await renderHook(() => ({
        addClipToRoll: useAddClipToRoll(),
        reorderRollClips: useReorderRollClips(),
        roll: useRollById(rollId),
      }));

      for (const clipId of clipIds) {
        await act(async () => result.current.addClipToRoll(rollId, clipId));
      }
      return { rollId, result };
    }

    function orderedClipIds(refs: { clipId: string; order: number }[] | undefined): string[] {
      return [...(refs ?? [])].sort((a, b) => a.order - b.order).map((ref) => ref.clipId);
    }

    it('rewrites orders to follow the given id sequence', async () => {
      const { rollId, result } = await setUpRollWithClips(['clip-1', 'clip-2', 'clip-3']);

      await act(async () => result.current.reorderRollClips(rollId, ['clip-3', 'clip-1', 'clip-2']));

      expect(orderedClipIds(result.current.roll?.clipRefs)).toEqual([
        'clip-3',
        'clip-1',
        'clip-2',
      ]);
    });

    it('keeps unlisted clips after the listed ones in their previous relative order', async () => {
      const { rollId, result } = await setUpRollWithClips(['clip-1', 'clip-2', 'clip-3', 'clip-4']);

      await act(async () => result.current.reorderRollClips(rollId, ['clip-3']));

      expect(orderedClipIds(result.current.roll?.clipRefs)).toEqual([
        'clip-3',
        'clip-1',
        'clip-2',
        'clip-4',
      ]);
    });

    it('ignores unknown and duplicate ids without changing membership', async () => {
      const { rollId, result } = await setUpRollWithClips(['clip-1', 'clip-2']);

      await act(async () =>
        result.current.reorderRollClips(rollId, ['ghost', 'clip-2', 'clip-2', 'clip-1']),
      );

      expect(orderedClipIds(result.current.roll?.clipRefs)).toEqual(['clip-2', 'clip-1']);
      expect(result.current.roll?.clipRefs).toHaveLength(2);
    });
  });

  it('transitions a roll status', async () => {
    ensureDailyRoll(JULY_23);
    const rollId = 'daily-2026-07-23';

    const { result } = await renderHook(() => ({
      setRollStatus: useSetRollStatus(),
      roll: useRollById(rollId),
    }));

    await act(async () => result.current.setRollStatus(rollId, 'developed'));

    expect(result.current.roll?.status).toBe('developed');
  });

  it('exposes the created daily roll through useTodayRoll and lists it', async () => {
    ensureDailyRoll();

    const { result } = await renderHook(() => ({ today: useTodayRoll(), rolls: useRolls() }));

    expect(result.current.today).toBeDefined();
    expect(result.current.today?.type).toBe('daily');
    expect(result.current.rolls).toHaveLength(1);
  });
});
