import { act, renderHook } from '@testing-library/react-native';

import type { Roll } from './roll';
import {
  ensureDailyRoll,
  useAddClipToRoll,
  useCreateManualRoll,
  useRemoveClipFromRoll,
  useRemoveClipsEverywhere,
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

  describe('createManualRoll', () => {
    it('creates an undeveloped free roll with no day key and no cuts yet', async () => {
      const { result } = await renderHook(() => useCreateManualRoll());

      let roll: Roll | undefined;
      await act(async () => {
        roll = result.current({ title: '\uB178\uC744 \uBAA8\uC74C', createdAt: JULY_23 }); // 노을 모음
      });

      expect(roll).toMatchObject({
        id: `manual-${JULY_23}`,
        type: 'free',
        collectionRule: 'manual',
        targetOrientation: 'portrait',
        status: 'undeveloped',
        createdAt: JULY_23,
        title: '\uB178\uC744 \uBAA8\uC74C', // 노을 모음
        clipRefs: [],
      });
      expect(roll?.dayKey).toBeUndefined();
      expect(useRollStore.getState().rolls).toHaveLength(1);
    });

    it('falls back to the day it was made when no name is given', async () => {
      const { result } = await renderHook(() => useCreateManualRoll());

      let roll: Roll | undefined;
      await act(async () => {
        roll = result.current({ createdAt: JULY_23 });
      });

      expect(roll?.title).toBe('\uBB36\uC74C 07-23'); // 묶음 07-23
    });

    it('caps a name at twenty characters', async () => {
      const { result } = await renderHook(() => useCreateManualRoll());

      let roll: Roll | undefined;
      await act(async () => {
        roll = result.current({ title: 'x'.repeat(30), createdAt: JULY_23 });
      });

      expect(roll?.title).toHaveLength(20);
    });

    // Unlike ensureDailyRoll, asking twice means the user wanted two rolls —
    // and two rolls sharing an id would take every membership write together.
    it('gives a second roll made in the same millisecond its own id', async () => {
      const { result } = await renderHook(() => useCreateManualRoll());

      await act(async () => {
        result.current({ createdAt: JULY_23 });
        result.current({ createdAt: JULY_23 });
      });

      expect(useRollStore.getState().rolls.map((roll) => roll.id)).toEqual([
        `manual-${JULY_23}`,
        `manual-${JULY_23}-2`,
      ]);
    });

    it('leaves the daily roll alone — a free roll is never today', async () => {
      ensureDailyRoll(JULY_23);

      const { result } = await renderHook(() => ({
        createManualRoll: useCreateManualRoll(),
        today: useTodayRoll(),
      }));
      await act(async () => result.current.createManualRoll({ createdAt: JULY_23_LATER }));

      expect(result.current.today?.id).toBe('daily-2026-07-23');
      expect(ensureDailyRoll(JULY_23_LATER).id).toBe('daily-2026-07-23');
    });
  });

  describe('retiring an emptied free roll', () => {
    function seedFreeRoll(overrides: Partial<Roll> = {}) {
      useRollStore.setState({
        rolls: [
          {
            id: 'manual-1',
            type: 'free',
            collectionRule: 'manual',
            targetOrientation: 'portrait',
            status: 'undeveloped',
            createdAt: JULY_23,
            title: '\uBB36\uC74C 07-23', // 묶음 07-23
            clipRefs: [
              { clipId: 'clip-1', order: 0 },
              { clipId: 'clip-2', order: 1 },
            ],
            ...overrides,
          },
        ],
      });
    }

    it('drops the roll once its last cut is taken out', async () => {
      seedFreeRoll();

      const { result } = await renderHook(() => ({
        removeClipFromRoll: useRemoveClipFromRoll(),
        rolls: useRolls(),
      }));

      await act(async () => result.current.removeClipFromRoll('manual-1', 'clip-1'));
      expect(result.current.rolls).toHaveLength(1);

      await act(async () => result.current.removeClipFromRoll('manual-1', 'clip-2'));
      expect(result.current.rolls).toEqual([]);
    });

    it('drops the roll when deleting the originals empties it', async () => {
      seedFreeRoll();

      const { result } = await renderHook(() => ({
        removeClipsEverywhere: useRemoveClipsEverywhere(),
        rolls: useRolls(),
      }));

      await act(async () => result.current.removeClipsEverywhere(['clip-1', 'clip-2']));

      expect(result.current.rolls).toEqual([]);
    });

    it('keeps an emptied daily roll — an empty today is the invitation', async () => {
      ensureDailyRoll(JULY_23);
      const rollId = 'daily-2026-07-23';

      const { result } = await renderHook(() => ({
        addClipToRoll: useAddClipToRoll(),
        removeClipFromRoll: useRemoveClipFromRoll(),
        rolls: useRolls(),
      }));

      await act(async () => result.current.addClipToRoll(rollId, 'clip-1'));
      await act(async () => result.current.removeClipFromRoll(rollId, 'clip-1'));

      expect(result.current.rolls.map((roll) => roll.id)).toEqual([rollId]);
    });

    it('keeps a developed free roll — its reel is a finished artifact', async () => {
      seedFreeRoll({
        status: 'developed',
        reel: { clipRefs: [{ clipId: 'clip-1', order: 0 }], developedAt: JULY_23_LATER },
      });

      const { result } = await renderHook(() => ({
        removeClipsEverywhere: useRemoveClipsEverywhere(),
        rolls: useRolls(),
      }));

      await act(async () => result.current.removeClipsEverywhere(['clip-1', 'clip-2']));

      expect(result.current.rolls.map((roll) => roll.id)).toEqual(['manual-1']);
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

  describe('removeClipsEverywhere', () => {
    function seedRolls() {
      useRollStore.setState({
        rolls: [
          {
            id: 'daily-2026-07-23',
            type: 'daily',
            collectionRule: 'all-day',
            targetOrientation: 'portrait',
            status: 'developed',
            createdAt: JULY_23,
            dayKey: '2026-07-23',
            title: '2026-07-23 \uB864', // 롤
            clipRefs: [
              { clipId: 'clip-1', order: 0 },
              { clipId: 'clip-2', order: 1 },
            ],
            reel: {
              clipRefs: [
                { clipId: 'clip-1', order: 0 },
                { clipId: 'clip-2', order: 1 },
              ],
              developedAt: JULY_23_LATER,
            },
          },
          {
            id: 'daily-2026-07-24',
            type: 'daily',
            collectionRule: 'all-day',
            targetOrientation: 'portrait',
            status: 'undeveloped',
            createdAt: JULY_24,
            dayKey: '2026-07-24',
            title: '2026-07-24 \uB864', // 롤
            clipRefs: [
              { clipId: 'clip-1', order: 0 },
              { clipId: 'clip-3', order: 1 },
            ],
          },
        ],
      });
    }

    it('drops the clip from every roll that references it', async () => {
      seedRolls();

      const { result } = await renderHook(() => ({
        removeClipsEverywhere: useRemoveClipsEverywhere(),
        rolls: useRolls(),
      }));

      await act(async () => result.current.removeClipsEverywhere(['clip-1']));

      expect(result.current.rolls.map((roll) => roll.clipRefs.map((ref) => ref.clipId))).toEqual([
        ['clip-2'],
        ['clip-3'],
      ]);
    });

    it('rewrites a developed reel so it cannot play a deleted original', async () => {
      seedRolls();

      const { result } = await renderHook(() => ({
        removeClipsEverywhere: useRemoveClipsEverywhere(),
        roll: useRollById('daily-2026-07-23'),
      }));

      await act(async () => result.current.removeClipsEverywhere(['clip-1']));

      expect(result.current.roll?.reel?.clipRefs.map((ref) => ref.clipId)).toEqual(['clip-2']);
      expect(result.current.roll?.reel?.developedAt).toBe(JULY_23_LATER);
    });

    it('removes several clips in one write', async () => {
      seedRolls();

      const { result } = await renderHook(() => ({
        removeClipsEverywhere: useRemoveClipsEverywhere(),
        rolls: useRolls(),
      }));

      await act(async () => result.current.removeClipsEverywhere(['clip-1', 'clip-3']));

      expect(result.current.rolls.map((roll) => roll.clipRefs.map((ref) => ref.clipId))).toEqual([
        ['clip-2'],
        [],
      ]);
    });

    it('keeps the order values of the references that remain', async () => {
      seedRolls();

      const { result } = await renderHook(() => ({
        removeClipsEverywhere: useRemoveClipsEverywhere(),
        roll: useRollById('daily-2026-07-23'),
      }));

      await act(async () => result.current.removeClipsEverywhere(['clip-1']));

      expect(result.current.roll?.clipRefs).toEqual([{ clipId: 'clip-2', order: 1 }]);
    });

    // Identity, not just equality: an untouched roll must keep its object so
    // subscribed screens do not re-render over a delete that missed them.
    it.each([[[]], [['clip-unknown']]])('leaves every roll untouched for %j', async (clipIds) => {
      seedRolls();
      const before = useRollStore.getState().rolls;

      const { result } = await renderHook(() => useRemoveClipsEverywhere());
      await act(async () => result.current(clipIds));

      const after = useRollStore.getState().rolls;
      expect(after.map((roll, index) => roll === before[index])).toEqual([true, true]);
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

      await act(async () =>
        result.current.reorderRollClips(rollId, ['clip-3', 'clip-1', 'clip-2']),
      );

      expect(orderedClipIds(result.current.roll?.clipRefs)).toEqual(['clip-3', 'clip-1', 'clip-2']);
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
