import { renderHook } from '@testing-library/react-native';

import type { Roll } from '@/entities/roll';

import { useCollectTargets } from './use-collect-targets';

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

describe('useCollectTargets', () => {
  it.each(['developing', 'developed'] as const)('leaves out a %s roll', async (status) => {
    mockRolls = [makeRoll('roll-open'), makeRoll('roll-closed', { status })];

    const { result } = await renderHook(() => useCollectTargets(['clip-1']));

    expect(result.current.map((target) => target.rollId)).toEqual(['roll-open']);
  });

  it('keeps a roll holding nothing — an empty roll is a valid target', async () => {
    mockRolls = [makeRoll('roll-empty')];

    const { result } = await renderHook(() => useCollectTargets(['clip-1']));

    expect(result.current).toEqual([
      expect.objectContaining({ rollId: 'roll-empty', cutCount: 0, heldCount: 0 }),
    ]);
  });

  it('orders today first, then the most recently created', async () => {
    const today = makeRoll('roll-today', { createdAt: 10 });
    mockRolls = [
      makeRoll('roll-old', { createdAt: 20 }),
      today,
      makeRoll('roll-new', { createdAt: 30 }),
    ];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useCollectTargets(['clip-1']));

    expect(result.current.map((target) => target.rollId)).toEqual([
      'roll-today',
      'roll-new',
      'roll-old',
    ]);
  });

  it('reports how much of the selection a roll already holds', async () => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1', 'clip-9') })];

    const { result } = await renderHook(() => useCollectTargets(['clip-1', 'clip-2']));

    expect(result.current[0]).toMatchObject({ cutCount: 2, heldCount: 1, holdsAll: false });
  });

  it('marks a roll that already holds every selected cut', async () => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1', 'clip-2') })];

    const { result } = await renderHook(() => useCollectTargets(['clip-1', 'clip-2']));

    expect(result.current[0]).toMatchObject({ heldCount: 2, holdsAll: true });
  });

  it('holds nothing when nothing is offered', async () => {
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() => useCollectTargets([]));

    expect(result.current[0]).toMatchObject({ heldCount: 0, holdsAll: false });
  });

  it('gives today the reserved ember tint', async () => {
    const today = makeRoll('roll-today');
    mockRolls = [today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useCollectTargets(['clip-1']));

    expect(result.current[0]).toMatchObject({ isToday: true, tint: '#EA5E38' });
  });
});
