import { renderHook } from '@testing-library/react-native';

import type { Clip } from '@/entities/clip';
import { toDayKey, type Reel, type Roll } from '@/entities/roll';

import { useCutRollFilters, useCutStrip, type CutFilter } from './use-cut-strip';

let mockClips: Clip[];
let mockRolls: Roll[];
let mockTodayRoll: Roll | undefined;

// The roll store is persisted; keep the real tint and day-key helpers but never
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
  useClipsHydrated: () => true,
}));
jest.mock('@/entities/roll', () => ({
  ...jest.requireActual('@/entities/roll'),
  useRolls: () => mockRolls,
  useTodayRoll: () => mockTodayRoll,
}));
// Only the day heading comes from here, and its own suite covers the wording.
// A stable key keeps this suite's assertions about grouping, not formatting.
jest.mock('@/features/manage-recordings', () => ({
  formatRecordingDay: (timestamp: number) => `day:${timestamp}`,
  relativeDayLabel: () => undefined,
}));

const All: CutFilter = { kind: 'all' };
const Loose: CutFilter = { kind: 'loose' };
const Undeveloped: CutFilter = { kind: 'undeveloped' };

/** Real membership: the widget under the model inverts these references. */
function refs(...clipIds: string[]) {
  return clipIds.map((clipId, order) => ({ clipId, order }));
}

function at(dayKey: string, hour: number): number {
  return new Date(`${dayKey}T${String(hour).padStart(2, '0')}:00:00`).getTime();
}

function makeClip(id: string, capturedAt: number, durationSec = 3): Clip {
  return {
    id,
    uri: `file:///${id}.mp4`,
    durationSec,
    capturedAt,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
  };
}

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

function developedRoll(id: string, clipIds: string[]): Roll {
  const reel: Reel = { clipRefs: refs(...clipIds), developedAt: 2 };
  return makeRoll(id, { status: 'developed', clipRefs: refs(...clipIds), reel });
}

beforeEach(() => {
  mockClips = [];
  mockRolls = [];
  mockTodayRoll = undefined;
});

describe('useCutStrip', () => {
  it('groups cuts into one strip per capture day, newest day first', async () => {
    mockClips = [
      makeClip('clip-1', at('2026-07-20', 9)),
      makeClip('clip-2', at('2026-07-24', 10)),
      makeClip('clip-3', at('2026-07-24', 19)),
    ];

    const { result } = await renderHook(() => useCutStrip(All));

    expect(result.current.days.map((day) => day.dayKey)).toEqual(['2026-07-24', '2026-07-20']);
    // Newest cut first inside a day, the order the strip draws frames in.
    expect(result.current.days[0].cuts.map((cut) => cut.clip.id)).toEqual(['clip-3', 'clip-2']);
  });

  it('numbers cuts across the whole archive, oldest as 01', async () => {
    mockClips = [
      makeClip('clip-old', at('2026-07-20', 9)),
      makeClip('clip-new', at('2026-07-24', 9)),
    ];

    const { result } = await renderHook(() => useCutStrip(All));

    expect(result.current.days[0].cuts[0].no).toBe('02');
    expect(result.current.days[1].cuts[0].no).toBe('01');
  });

  it('attaches every roll holding a cut, so a cut in two rolls draws two dots', async () => {
    mockClips = [makeClip('clip-1', at('2026-07-24', 9))];
    mockRolls = [
      makeRoll('roll-older', { createdAt: 1, clipRefs: refs('clip-1') }),
      makeRoll('roll-newer', { createdAt: 2, clipRefs: refs('clip-1') }),
    ];

    const { result } = await renderHook(() => useCutStrip(All));

    // Newest roll first, the order the frame draws its dots in.
    expect(result.current.days[0].cuts[0].rolls.map((roll) => roll.rollId)).toEqual([
      'roll-newer',
      'roll-older',
    ]);
  });

  it('counts the cuts no roll holds, whatever the filter shows', async () => {
    mockClips = [
      makeClip('clip-held', at('2026-07-24', 9)),
      makeClip('clip-loose', at('2026-07-24', 10)),
    ];
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-held') })];

    const { result } = await renderHook(() => useCutStrip(Loose));

    expect(result.current.looseCount).toBe(1);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.count).toBe(1);
    expect(result.current.days[0].cuts.map((cut) => cut.clip.id)).toEqual(['clip-loose']);
  });

  it('drops the days a filter empties entirely', async () => {
    mockClips = [
      makeClip('clip-1', at('2026-07-20', 9)),
      makeClip('clip-2', at('2026-07-24', 9)),
    ];
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-2') })];

    const { result } = await renderHook(() => useCutStrip(Loose));

    expect(result.current.days.map((day) => day.dayKey)).toEqual(['2026-07-20']);
  });

  it('treats "미현상" as "no reel was made of it", including cuts no roll holds', async () => {
    mockClips = [
      makeClip('clip-developed', at('2026-07-24', 9)),
      makeClip('clip-waiting', at('2026-07-24', 10)),
      makeClip('clip-loose', at('2026-07-24', 11)),
    ];
    mockRolls = [
      developedRoll('roll-done', ['clip-developed']),
      makeRoll('roll-waiting', { clipRefs: refs('clip-waiting') }),
    ];

    const { result } = await renderHook(() => useCutStrip(Undeveloped));

    expect(result.current.days[0].cuts.map((cut) => cut.clip.id)).toEqual([
      'clip-loose',
      'clip-waiting',
    ]);
  });

  it('keeps only one roll’s cuts under a roll filter', async () => {
    mockClips = [
      makeClip('clip-1', at('2026-07-24', 9)),
      makeClip('clip-2', at('2026-07-24', 10)),
    ];
    mockRolls = [makeRoll('roll-a', { clipRefs: refs('clip-1') })];

    const { result } = await renderHook(() =>
      useCutStrip({ kind: 'roll', rollId: 'roll-a' } satisfies CutFilter),
    );

    expect(result.current.days[0].cuts.map((cut) => cut.clip.id)).toEqual(['clip-1']);
  });

  it('reports a day as developed even when the filter hides its developed cuts', async () => {
    mockClips = [
      makeClip('clip-developed', at('2026-07-24', 9)),
      makeClip('clip-loose', at('2026-07-24', 10)),
    ];
    mockRolls = [developedRoll('roll-done', ['clip-developed'])];

    const { result } = await renderHook(() => useCutStrip(Loose));

    expect(result.current.days[0].status).toBe('developed');
  });

  it.each([
    ['ready', undefined],
    ['collecting', 'today'],
  ])('marks a day as %s', async (status, today) => {
    const dayKey = today ? toDayKey(Date.now()) : '2026-07-20';
    mockClips = [makeClip('clip-1', today ? Date.now() : at(dayKey, 9))];
    if (today) mockTodayRoll = makeRoll('daily-today', { dayKey });

    const { result } = await renderHook(() => useCutStrip(All));

    expect(result.current.days[0].status).toBe(status);
  });

  it('pads today’s strip up to the daily soft target and no other day', async () => {
    const todayKey = toDayKey(Date.now());
    mockTodayRoll = makeRoll('daily-today', { dayKey: todayKey });
    mockClips = [
      makeClip('clip-today', Date.now()),
      makeClip('clip-past', at('2026-07-20', 9)),
    ];

    const { result } = await renderHook(() => useCutStrip(All));

    const [today, past] = result.current.days;
    expect(today.dayKey).toBe(todayKey);
    expect(today.emptySlotCount).toBe(11);
    // A past day's unfilled frames are not an invitation — that day is over.
    expect(past.emptySlotCount).toBe(0);
  });

  it('shows no empty frames on a filtered strip', async () => {
    const todayKey = toDayKey(Date.now());
    mockTodayRoll = makeRoll('daily-today', { dayKey: todayKey });
    mockClips = [makeClip('clip-today', Date.now())];

    const { result } = await renderHook(() => useCutStrip(Loose));

    expect(result.current.days[0].emptySlotCount).toBe(0);
  });

  it('sums the length of the cuts a day shows', async () => {
    mockClips = [
      makeClip('clip-1', at('2026-07-24', 9), 3),
      makeClip('clip-2', at('2026-07-24', 10), 5),
    ];

    const { result } = await renderHook(() => useCutStrip(All));

    expect(result.current.days[0].totalSec).toBe(8);
  });
});

describe('useCutRollFilters', () => {
  it('offers only the rolls that hold a cut, with their cut counts', async () => {
    mockClips = [
      makeClip('clip-1', at('2026-07-24', 9)),
      makeClip('clip-2', at('2026-07-24', 10)),
    ];
    mockRolls = [
      makeRoll('roll-a', { clipRefs: refs('clip-1', 'clip-2') }),
      makeRoll('roll-empty'),
    ];

    const { result } = await renderHook(() => useCutRollFilters());

    expect(result.current.map((roll) => [roll.rollId, roll.cutCount])).toEqual([['roll-a', 2]]);
  });

  it('puts today’s roll first, then the most recently collected', async () => {
    const todayKey = toDayKey(Date.now());
    mockTodayRoll = makeRoll('daily-today', { dayKey: todayKey, clipRefs: refs('clip-today') });
    mockClips = [
      makeClip('clip-old', at('2026-07-20', 9)),
      makeClip('clip-today', Date.now()),
    ];
    mockRolls = [makeRoll('roll-old', { clipRefs: refs('clip-old') }), mockTodayRoll];

    const { result } = await renderHook(() => useCutRollFilters());

    expect(result.current.map((roll) => roll.rollId)).toEqual(['daily-today', 'roll-old']);
    expect(result.current[0].isToday).toBe(true);
  });
});
