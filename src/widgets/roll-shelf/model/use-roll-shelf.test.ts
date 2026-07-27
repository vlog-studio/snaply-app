import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import type { Reel, Roll } from '@/entities/roll';

import {
  formatReelLength,
  useDevelopedRollMonths,
  useRollsAwaitingDevelop,
} from './use-roll-shelf';

let mockRolls: Roll[];
let mockClips: Clip[];
let mockTodayRoll: Roll | undefined;

// The roll store is persisted; keep the real tint and month helpers but never
// touch storage.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/entities/clip', () => ({
  useClips: () => mockClips,
}));
jest.mock('@/entities/roll', () => ({
  ...jest.requireActual('@/entities/roll'),
  useRolls: () => mockRolls,
  useTodayRoll: () => mockTodayRoll,
}));

function makeClip(id: string, durationSec: number, capturedOn = '2026-07-24'): Clip {
  return {
    id,
    uri: `file:///${id}.mp4`,
    durationSec,
    capturedAt: new Date(`${capturedOn}T09:00:00`).getTime(),
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
  };
}

function refs(...clipIds: string[]) {
  return clipIds.map((clipId, order) => ({ clipId, order }));
}

function makeRoll(dayKey: string, overrides: Partial<Roll> = {}): Roll {
  return {
    id: `daily-${dayKey}`,
    type: 'daily',
    collectionRule: 'all-day',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt: new Date(`${dayKey}T09:00:00`).getTime(),
    dayKey,
    title: `${dayKey} \uB864`, // 롤
    clipRefs: [],
    ...overrides,
  };
}

function developed(dayKey: string, clipIds: string[], developedAt: number): Roll {
  const reel: Reel = { clipRefs: refs(...clipIds), developedAt };
  return makeRoll(dayKey, { status: 'developed', clipRefs: refs(...clipIds), reel });
}

/** A roll the user bundled by hand: no `dayKey`, filed by the day it was made. */
function freeRoll(id: string, madeOn: string, overrides: Partial<Roll> = {}): Roll {
  return {
    id,
    type: 'free',
    collectionRule: 'manual',
    targetOrientation: 'portrait',
    status: 'undeveloped',
    createdAt: new Date(`${madeOn}T09:00:00`).getTime(),
    title: '\uB178\uC744 \uBAA8\uC74C', // 노을 모음
    clipRefs: [],
    ...overrides,
  };
}

beforeEach(() => {
  mockRolls = [];
  mockClips = [];
  mockTodayRoll = undefined;
});

describe('useRollsAwaitingDevelop', () => {
  it("keeps today's roll in the lane even with no cuts yet", async () => {
    const today = makeRoll('2026-07-27');
    mockRolls = [today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current.map((roll) => roll.id)).toEqual(['daily-2026-07-27']);
    expect(result.current[0]).toMatchObject({ isToday: true, clipCount: 0 });
  });

  it('excludes an earlier roll that holds no cuts', async () => {
    const today = makeRoll('2026-07-27');
    mockRolls = [makeRoll('2026-07-25'), today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current.map((roll) => roll.id)).toEqual(['daily-2026-07-27']);
  });

  it('includes an earlier roll that has cuts waiting to be developed', async () => {
    const today = makeRoll('2026-07-27');
    mockRolls = [makeRoll('2026-07-26', { clipRefs: refs('clip-1') }), today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current.map((roll) => roll.id)).toEqual(['daily-2026-07-27', 'daily-2026-07-26']);
  });

  it('excludes a roll that is already developed', async () => {
    mockRolls = [developed('2026-07-24', ['clip-1'], 100)];

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current).toEqual([]);
  });

  it('still surfaces a roll left mid-ceremony so it cannot disappear', async () => {
    mockRolls = [makeRoll('2026-07-26', { status: 'developing', clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current.map((roll) => roll.status)).toEqual(['developing']);
  });

  it('orders today first, then the most recent roll', async () => {
    const today = makeRoll('2026-07-27');
    mockRolls = [
      makeRoll('2026-07-20', { clipRefs: refs('clip-1') }),
      makeRoll('2026-07-26', { clipRefs: refs('clip-2') }),
      today,
    ];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current.map((roll) => roll.dayKey)).toEqual([
      '2026-07-27',
      '2026-07-26',
      '2026-07-20',
    ]);
  });

  it('samples up to four clip URIs for the cover and sums their length', async () => {
    mockClips = ['a', 'b', 'c', 'd', 'e'].map((id) => makeClip(id, 3));
    mockRolls = [makeRoll('2026-07-26', { clipRefs: refs('a', 'b', 'c', 'd', 'e') })];

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current[0].coverUris).toEqual([
      'file:///a.mp4',
      'file:///b.mp4',
      'file:///c.mp4',
      'file:///d.mp4',
    ]);
    expect(result.current[0]).toMatchObject({ clipCount: 5, totalSec: 15 });
  });

  it('stands a hand-made roll in the lane beside the daily ones', async () => {
    const today = makeRoll('2026-07-27');
    mockClips = [makeClip('a', 3)];
    mockRolls = [freeRoll('manual-1', '2026-07-26', { clipRefs: refs('a') }), today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current.map((roll) => roll.id)).toEqual(['daily-2026-07-27', 'manual-1']);
  });

  it('files a hand-made roll under the day it was bundled', async () => {
    mockClips = [makeClip('a', 3, '2026-07-18')];
    mockRolls = [freeRoll('manual-1', '2026-07-26', { clipRefs: refs('a') })];

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current[0]).toMatchObject({ date: '2026-07-26', dayRange: '07-18' });
    expect(result.current[0].dayKey).toBeUndefined();
  });

  it('spans the days a hand-made roll collected across', async () => {
    mockClips = [
      makeClip('a', 3, '2026-07-24'),
      makeClip('b', 3, '2026-07-18'),
      makeClip('c', 3, '2026-07-20'),
    ];
    mockRolls = [freeRoll('manual-1', '2026-07-26', { clipRefs: refs('a', 'b', 'c') })];

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current[0].dayRange).toBe('07-18~07-24');
  });

  it("gives today's roll the reserved ember tint", async () => {
    const today = makeRoll('2026-07-27');
    mockRolls = [today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useRollsAwaitingDevelop());

    expect(result.current[0].tint).toBe('#EA5E38');
  });
});

describe('useDevelopedRollMonths', () => {
  it('groups developed rolls into month sections, newest month first', async () => {
    mockRolls = [
      developed('2026-06-30', ['a'], 10),
      developed('2026-07-21', ['b'], 20),
      developed('2026-07-24', ['c'], 30),
    ];

    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current.map((month) => month.key)).toEqual(['2026-07', '2026-06']);
    expect(result.current[0].label).toBe('2026.07');
    expect(result.current[0].rolls.map((roll) => roll.dayKey)).toEqual([
      '2026-07-24',
      '2026-07-21',
    ]);
  });

  // Sorting on `dayKey` would file every hand-made roll at the bottom of its
  // month, since it has none.
  it('orders a hand-made roll among the daily ones by the day it stands for', async () => {
    const bundled = freeRoll('manual-1', '2026-07-22', {
      status: 'developed',
      clipRefs: refs('a'),
      reel: { clipRefs: refs('a'), developedAt: 25 },
    });
    mockRolls = [developed('2026-07-24', ['b'], 30), bundled, developed('2026-07-21', ['c'], 20)];

    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current[0].rolls.map((roll) => roll.id)).toEqual([
      'daily-2026-07-24',
      'manual-1',
      'daily-2026-07-21',
    ]);
  });

  it('excludes rolls that are not developed and rolls without a reel', async () => {
    mockRolls = [
      makeRoll('2026-07-26', { clipRefs: refs('a') }),
      makeRoll('2026-07-25', { status: 'developed', clipRefs: refs('b') }),
    ];

    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current).toEqual([]);
  });

  it('summarizes a developed roll from its reel, not its membership', async () => {
    mockClips = [makeClip('a', 4), makeClip('b', 5)];
    // The reel holds one of the two cuts the roll collected.
    const roll = developed('2026-07-24', ['a'], 30);
    mockRolls = [{ ...roll, clipRefs: refs('a', 'b') }];

    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current[0].rolls[0]).toMatchObject({ clipCount: 1, totalSec: 4 });
  });

  it('counts the elapsed days of the current month that hold no cut', async () => {
    const today = makeRoll('2026-07-05', { clipRefs: refs('c') });
    mockRolls = [developed('2026-07-01', ['a'], 10), developed('2026-07-03', ['b'], 20), today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useDevelopedRollMonths());

    // Five days elapsed; the 1st, 3rd and 5th were collected.
    expect(result.current[0].emptyDayCount).toBe(2);
  });

  it('counts an undeveloped day as collected, not empty', async () => {
    const today = makeRoll('2026-07-03');
    mockRolls = [
      developed('2026-07-01', ['a'], 10),
      makeRoll('2026-07-02', { clipRefs: refs('b') }),
      today,
    ];
    mockTodayRoll = today;

    // The 3rd is today and holds nothing yet, so only it is empty.
    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current[0].emptyDayCount).toBe(1);
  });

  it('counts a past month against all of its days', async () => {
    const today = makeRoll('2026-07-05');
    mockRolls = [developed('2026-06-30', ['a'], 10), today];
    mockTodayRoll = today;

    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current[0].key).toBe('2026-06');
    expect(result.current[0].emptyDayCount).toBe(29);
  });

  it("reports no empty days until today's roll establishes the date", async () => {
    mockRolls = [developed('2026-07-01', ['a'], 10)];

    const { result } = await renderHook(() => useDevelopedRollMonths());

    expect(result.current[0].emptyDayCount).toBe(0);
  });
});

describe('formatReelLength', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [72, '1:12'],
  ])('formats %i seconds as %s', (totalSec, expected) => {
    expect(formatReelLength(totalSec)).toBe(expected);
  });
});
