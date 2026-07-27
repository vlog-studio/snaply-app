import { renderHook } from '@testing-library/react-native';

import type { Roll } from '@/entities/roll';

import { useClipMembership, useRollDeleteImpact, useRollsForClip } from './use-clip-membership';

let mockRolls: Roll[];
let mockTodayRoll: Roll | undefined;

// The roll store is persisted; keep the real tint logic but never touch storage.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/entities/roll', () => ({
  ...jest.requireActual('@/entities/roll'),
  useRolls: () => mockRolls,
  useTodayRoll: () => mockTodayRoll,
}));

function makeRoll(id: string, overrides: Partial<Roll> = {}): Roll {
  return {
    id,
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt: 1,
    title: `${id} 롤`, // 롤
    clipRefs: [],
    ...overrides,
  };
}

function refs(...clipIds: string[]) {
  return clipIds.map((clipId, order) => ({ clipId, order }));
}

beforeEach(() => {
  mockRolls = [];
  mockTodayRoll = undefined;
});

describe('useClipMembership', () => {
  it('inverts roll membership into a clip-keyed map', async () => {
    mockRolls = [
      makeRoll('roll-a', { clipRefs: refs('clip-1', 'clip-2') }),
      makeRoll('roll-b', { clipRefs: refs('clip-2') }),
    ];

    const { result } = await renderHook(() => useClipMembership());

    expect(result.current.get('clip-1')?.map((badge) => badge.rollId)).toEqual(['roll-a']);
    expect(result.current.get('clip-2')?.map((badge) => badge.rollId)).toEqual([
      'roll-a',
      'roll-b',
    ]);
  });

  it('omits clips that belong to no roll', async () => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() => useClipMembership());

    expect(result.current.has('clip-9')).toBe(false);
  });

  it('orders a clip its rolls today-first then newest-first', async () => {
    const today = makeRoll('roll-today', { createdAt: 10, clipRefs: refs('clip-1') });
    mockRolls = [
      makeRoll('roll-old', { createdAt: 20, clipRefs: refs('clip-1') }),
      today,
      makeRoll('roll-new', { createdAt: 30, clipRefs: refs('clip-1') }),
    ];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useClipMembership());

    expect(result.current.get('clip-1')?.map((badge) => badge.rollId)).toEqual([
      'roll-today',
      'roll-new',
      'roll-old',
    ]);
  });

  it('marks a developed roll as membership-frozen and an undeveloped one as editable', async () => {
    mockRolls = [
      makeRoll('roll-done', {
        status: 'developed',
        clipRefs: refs('clip-1'),
        reel: { clipRefs: refs('clip-1'), developedAt: 1 },
      }),
      makeRoll('roll-open', { status: 'undeveloped', clipRefs: refs('clip-1') }),
    ];

    const { result } = await renderHook(() => useClipMembership());
    const byRollId = new Map(
      result.current.get('clip-1')?.map((badge) => [badge.rollId, badge]) ?? [],
    );

    expect(byRollId.get('roll-done')?.canEditMembership).toBe(false);
    expect(byRollId.get('roll-open')?.canEditMembership).toBe(true);
  });

  it('gives today the reserved ember tint and other rolls their own', async () => {
    const today = makeRoll('roll-today', { clipRefs: refs('clip-1') });
    mockRolls = [today, makeRoll('roll-other', { clipRefs: refs('clip-1') })];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useClipMembership());
    const badges = result.current.get('clip-1') ?? [];

    expect(badges[0]).toMatchObject({ rollId: 'roll-today', isToday: true, tint: '#EA5E38' });
    expect(badges[1]?.isToday).toBe(false);
  });

  it('keeps a roll tint stable when another roll is added', async () => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];
    const first = await renderHook(() => useClipMembership());
    const before = first.result.current.get('clip-1')?.[0]?.tint;

    mockRolls = [
      makeRoll('roll-zzz', { createdAt: 99, clipRefs: refs('clip-1') }),
      makeRoll('roll-a', { clipRefs: refs('clip-1') }),
    ];
    const second = await renderHook(() => useClipMembership());
    const after = second.result.current
      .get('clip-1')
      ?.find((badge) => badge.rollId === 'roll-a')?.tint;

    expect(after).toBe(before);
  });
});

describe('useRollsForClip', () => {
  it('returns the clip rolls', async () => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() => useRollsForClip('clip-1'));

    expect(result.current.map((badge) => badge.rollId)).toEqual(['roll-a']);
  });

  it.each([undefined, 'clip-unknown'])('returns an empty list for %s', async (clipId) => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() => useRollsForClip(clipId));

    expect(result.current).toEqual([]);
  });
});

describe('useRollDeleteImpact', () => {
  it('names each affected roll once, with the cuts it loses', async () => {
    mockRolls = [
      makeRoll('roll-a', { clipRefs: refs('clip-1', 'clip-2', 'clip-3') }),
      makeRoll('roll-b', { clipRefs: refs('clip-2') }),
      makeRoll('roll-c', { clipRefs: refs('clip-9') }),
    ];

    const { result } = await renderHook(() => useRollDeleteImpact(['clip-1', 'clip-2']));

    expect(
      result.current.map(({ rollId, cutCount, nextCutCount }) => ({
        rollId,
        cutCount,
        nextCutCount,
      })),
    ).toEqual([
      { rollId: 'roll-a', cutCount: 3, nextCutCount: 1 },
      { rollId: 'roll-b', cutCount: 1, nextCutCount: 0 },
    ]);
  });

  it('counts a developed roll by its reel, which the delete rewrites too', async () => {
    mockRolls = [
      makeRoll('roll-done', {
        status: 'developed',
        clipRefs: refs('clip-1', 'clip-2', 'clip-3', 'clip-4'),
        reel: { clipRefs: refs('clip-1', 'clip-2', 'clip-3', 'clip-4'), developedAt: 1 },
      }),
    ];

    const { result } = await renderHook(() => useRollDeleteImpact(['clip-2']));

    expect(result.current[0]).toMatchObject({
      rollId: 'roll-done',
      canEditMembership: false,
      cutCount: 4,
      nextCutCount: 3,
    });
  });

  it('includes a developed roll whose reel still refers to the cut', async () => {
    mockRolls = [
      makeRoll('roll-done', {
        status: 'developed',
        clipRefs: [],
        reel: { clipRefs: refs('clip-1'), developedAt: 1 },
      }),
    ];

    const { result } = await renderHook(() => useRollDeleteImpact(['clip-1']));

    expect(result.current.map((impact) => impact.rollId)).toEqual(['roll-done']);
  });

  it('orders the affected rolls today-first then newest-first', async () => {
    const today = makeRoll('roll-today', { createdAt: 10, clipRefs: refs('clip-1') });
    mockRolls = [
      makeRoll('roll-old', { createdAt: 20, clipRefs: refs('clip-1') }),
      today,
      makeRoll('roll-new', { createdAt: 30, clipRefs: refs('clip-1') }),
    ];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollDeleteImpact(['clip-1']));

    expect(result.current.map((impact) => impact.rollId)).toEqual([
      'roll-today',
      'roll-new',
      'roll-old',
    ]);
  });

  it.each([
    ['no roll holds the clips', ['clip-9']],
    ['nothing is being deleted', [] as string[]],
  ])('reports no impact when %s', async (_case, clipIds) => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() => useRollDeleteImpact(clipIds));

    expect(result.current).toEqual([]);
  });
});
