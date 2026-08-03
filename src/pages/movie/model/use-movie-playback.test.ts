import { renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';
import type { Snap } from '@/entities/snap';

import { useMoviePlayback } from './use-movie-playback';

const mockMovie = jest.fn<Movie | undefined, []>();
const mockSnaps = jest.fn<Snap[], []>();

jest.mock('@/entities/movie', () => ({
  useMovieById: () => mockMovie(),
}));
jest.mock('@/entities/snap', () => ({
  useSnapIndex: () => new Map(mockSnaps().map((snap: Snap) => [snap.id, snap])),
}));

function makeSnap(id: string, durationSec = 3): Snap {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec,
    capturedAt: 1_753_200_000_000,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
  };
}

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'm1',
    title: '무비',
    status: 'ready',
    createdAt: 1,
    updatedAt: 1,
    snapRefs: [
      { snapId: 's1', order: 0 },
      { snapId: 's2', order: 1 },
    ],
    style: 'calm',
    bgm: 'lofi-walk',
    captions: true,
    ratio: '9:16',
    render: { renderedAt: 2, durationSec: 8 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMovie.mockReturnValue(makeMovie());
  mockSnaps.mockReturnValue([makeSnap('s1', 3), makeSnap('s2', 5)]);
});

describe('useMoviePlayback', () => {
  it('plays every cut whole when nothing is trimmed', async () => {
    const { result } = await renderHook(() => useMoviePlayback('m1'));

    expect(result.current.cuts).toEqual([
      { snapId: 's1', uri: 'file:///doc/recordings/s1.mp4', startSec: 0, endSec: 3 },
      { snapId: 's2', uri: 'file:///doc/recordings/s2.mp4', startSec: 0, endSec: 5 },
    ]);
    expect(result.current.totalSec).toBe(8);
  });

  it('plays a trimmed cut inside its window', async () => {
    mockMovie.mockReturnValue(
      makeMovie({
        snapRefs: [{ snapId: 's2', order: 0, trim: { startSec: 1.5, endSec: 4 } }],
      }),
    );

    const { result } = await renderHook(() => useMoviePlayback('m1'));

    expect(result.current.cuts[0]).toMatchObject({ startSec: 1.5, endSec: 4 });
    expect(result.current.totalSec).toBe(2.5);
  });

  it('runs the cuts in stored order, not reference order', async () => {
    mockMovie.mockReturnValue(
      makeMovie({
        snapRefs: [
          { snapId: 's2', order: 1 },
          { snapId: 's1', order: 0 },
        ],
      }),
    );

    const { result } = await renderHook(() => useMoviePlayback('m1'));

    expect(result.current.cuts.map((cut) => cut.snapId)).toEqual(['s1', 's2']);
  });

  it('skips a cut whose original was deleted', async () => {
    mockSnaps.mockReturnValue([makeSnap('s2', 5)]);

    const { result } = await renderHook(() => useMoviePlayback('m1'));

    expect(result.current.cuts.map((cut) => cut.snapId)).toEqual(['s2']);
    expect(result.current.totalSec).toBe(5);
  });

  it('has nothing to play when every original is gone', async () => {
    mockSnaps.mockReturnValue([]);

    const { result } = await renderHook(() => useMoviePlayback('m1'));

    expect(result.current.cuts).toEqual([]);
    expect(result.current.totalSec).toBe(0);
  });

  it('has nothing to play for a movie that does not exist', async () => {
    mockMovie.mockReturnValue(undefined);

    const { result } = await renderHook(() => useMoviePlayback('gone'));

    expect(result.current.movie).toBeUndefined();
    expect(result.current.cuts).toEqual([]);
  });
});
