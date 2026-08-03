import { renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';
import type { Snap } from '@/entities/snap';

import { useInProgressMovies, useMovieSummaries, useReadyMovies } from './use-movie-shelf';

const mockMovies = jest.fn<Movie[], []>();
const mockSnaps = jest.fn<Snap[], []>();

jest.mock('@/entities/movie', () => {
  // The trim and step rules are the entity's own and tested there; the summary is
  // about which of them it reaches for, so they come from the real modules.
  const trim = jest.requireActual('@/entities/movie/lib/movie-trim');
  const generation = jest.requireActual('@/entities/movie/lib/movie-generation');
  return {
    useMovies: () => mockMovies(),
    cutsDurationSec: trim.cutsDurationSec,
    MovieGenerationStepCount: generation.MovieGenerationStepCount,
  };
});
jest.mock('@/entities/snap', () => {
  const actual = jest.requireActual('@/entities/snap/model/snap-refs');
  return {
    snapsByRefs: actual.snapsByRefs,
    useSnapIndex: () => new Map(mockSnaps().map((snap: Snap) => [snap.id, snap])),
  };
});

function makeSnap(id: string, durationSec: number): Snap {
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

function makeMovie(overrides: Partial<Movie> & Pick<Movie, 'id'>): Movie {
  return {
    title: '무비',
    status: 'draft',
    createdAt: 1_753_200_000_000,
    updatedAt: 1_753_200_000_000,
    snapRefs: [],
    style: 'calm',
    bgm: 'lofi-walk',
    captions: true,
    ratio: '9:16',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSnaps.mockReturnValue([makeSnap('s1', 3), makeSnap('s2', 5), makeSnap('s3', 4)]);
  mockMovies.mockReturnValue([]);
});

describe('useMovieSummaries', () => {
  it('sums the length of the resolved snaps and samples the first cuts as a cover', async () => {
    mockMovies.mockReturnValue([
      makeMovie({
        id: 'm1',
        snapRefs: [
          { snapId: 's2', order: 1 },
          { snapId: 's1', order: 0 },
        ],
      }),
    ]);

    const { result } = await renderHook(() => useMovieSummaries());

    expect(result.current[0]).toMatchObject({ id: 'm1', snapCount: 2, totalSec: 8 });
    // Cover frames follow cut order, not reference order.
    expect(result.current[0].coverUris).toEqual([
      'file:///doc/recordings/s1.mp4',
      'file:///doc/recordings/s2.mp4',
    ]);
  });

  it('counts a cut whose original was deleted, but cannot draw or time it', async () => {
    mockMovies.mockReturnValue([
      makeMovie({
        id: 'm1',
        snapRefs: [
          { snapId: 's1', order: 0 },
          { snapId: 'deleted', order: 1 },
        ],
      }),
    ]);

    const { result } = await renderHook(() => useMovieSummaries());

    expect(result.current[0]).toMatchObject({ snapCount: 2, totalSec: 3 });
    expect(result.current[0].coverUris).toHaveLength(1);
  });

  it('times a movie by what each cut actually plays, not by the whole snap', async () => {
    mockMovies.mockReturnValue([
      makeMovie({
        id: 'm1',
        snapRefs: [
          { snapId: 's2', order: 0, trim: { startSec: 1, endSec: 3.5 } },
          { snapId: 's1', order: 1 },
        ],
      }),
    ]);

    const { result } = await renderHook(() => useMovieSummaries());

    expect(result.current[0].totalSec).toBe(5.5);
  });

  it('reports how far a running job has come, and nothing for every other status', async () => {
    mockMovies.mockReturnValue([
      makeMovie({
        id: 'generating',
        status: 'generating',
        updatedAt: 2,
        job: { id: 'job-1', stepIndex: 2, startedAt: 1 },
      }),
      makeMovie({ id: 'draft', updatedAt: 1 }),
    ]);

    const { result } = await renderHook(() => useMovieSummaries());

    // Step 2 of five steps.
    expect(result.current[0].progress).toBeCloseTo(0.4);
    expect(result.current[1].progress).toBeUndefined();
  });

  it('orders movies by the most recent edit', async () => {
    mockMovies.mockReturnValue([
      makeMovie({ id: 'old', updatedAt: 1_753_200_000_000 }),
      makeMovie({ id: 'new', updatedAt: 1_753_900_000_000 }),
    ]);

    const { result } = await renderHook(() => useMovieSummaries());

    expect(result.current.map((movie) => movie.id)).toEqual(['new', 'old']);
  });
});

describe('the two lanes', () => {
  beforeEach(() => {
    mockMovies.mockReturnValue([
      makeMovie({ id: 'draft', status: 'draft', updatedAt: 4 }),
      makeMovie({ id: 'generating', status: 'generating', updatedAt: 3 }),
      makeMovie({ id: 'failed', status: 'failed', updatedAt: 2 }),
      makeMovie({ id: 'ready', status: 'ready', updatedAt: 1 }),
    ]);
  });

  it('puts everything unfinished on the board, failures included', async () => {
    const { result } = await renderHook(() => useInProgressMovies());

    expect(result.current.map((movie) => movie.id)).toEqual(['draft', 'generating', 'failed']);
  });

  it('keeps only finished movies in the shelf', async () => {
    const { result } = await renderHook(() => useReadyMovies());

    expect(result.current.map((movie) => movie.id)).toEqual(['ready']);
  });
});
