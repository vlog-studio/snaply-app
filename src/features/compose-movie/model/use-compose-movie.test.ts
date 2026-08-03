import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';

import { useComposeMovie } from './use-compose-movie';

const mockCreateMovie = jest.fn();
const mockUpdateMovieCuts = jest.fn();
const mockClearTray = jest.fn();
const mockGetMovieById = jest.fn<Movie | undefined, [string]>();
const mockTraySnapIds = jest.fn<string[], []>();

// Mock each dependency at its slice Public API so the test stays at the seam.
jest.mock('@/entities/movie', () => ({
  MovieSnapLimit: 10,
  getMovieById: (id: string) => mockGetMovieById(id),
  useCreateMovie: () => mockCreateMovie,
  useUpdateMovieCuts: () => mockUpdateMovieCuts,
}));
jest.mock('@/entities/tray', () => ({
  useTraySnapIds: () => mockTraySnapIds(),
  useClearTray: () => mockClearTray,
}));

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'm1',
    title: '무비',
    status: 'draft',
    createdAt: 1,
    updatedAt: 1,
    snapRefs: [
      { snapId: 's1', order: 0 },
      { snapId: 's2', order: 1 },
    ],
    style: 'calm',
    bgm: 'lofi-walk',
    ratio: '9:16',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTraySnapIds.mockReturnValue([]);
  mockGetMovieById.mockReturnValue(makeMovie());
});

describe('startMovieFromTray', () => {
  it('creates a draft from the tray in pick order and empties the tray', async () => {
    mockTraySnapIds.mockReturnValue(['s3', 's1']);
    const created = makeMovie({ id: 'new' });
    mockCreateMovie.mockReturnValue(created);
    const { result } = await renderHook(() => useComposeMovie());

    let movie;
    await act(async () => {
      movie = result.current.startMovieFromTray();
    });

    expect(mockCreateMovie).toHaveBeenCalledWith({ snapIds: ['s3', 's1'] });
    expect(mockClearTray).toHaveBeenCalled();
    expect(movie).toBe(created);
  });

  it('makes nothing from an empty tray', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let movie;
    await act(async () => {
      movie = result.current.startMovieFromTray();
    });

    expect(movie).toBeUndefined();
    expect(mockCreateMovie).not.toHaveBeenCalled();
    expect(mockClearTray).not.toHaveBeenCalled();
  });
});

describe('saveCuts', () => {
  it('renumbers order to the list order and keeps each trim', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.saveCuts('m1', [
        { snapId: 's2', order: 7, trim: { startSec: 1, endSec: 3 } },
        { snapId: 's1', order: 3 },
      ]);
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalledWith('m1', [
      { snapId: 's2', order: 0, trim: { startSec: 1, endSec: 3 } },
      { snapId: 's1', order: 1 },
    ]);
    expect(outcome).toEqual({ cutCount: 2 });
  });

  it('refuses an empty cut list', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.saveCuts('m1', []);
    });

    expect(outcome).toEqual({ cutCount: 2, refused: 'empty' });
    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
  });

  it('refuses more cuts than a movie may hold', async () => {
    const { result } = await renderHook(() => useComposeMovie());
    const tooMany = Array.from({ length: 11 }, (_, order) => ({ snapId: `s${order}`, order }));

    let outcome;
    await act(async () => {
      outcome = result.current.saveCuts('m1', tooMany);
    });

    expect(outcome).toEqual({ cutCount: 2, refused: 'full' });
    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
  });

  it.each(['generating', 'ready'] as const)('refuses a %s movie', async (status) => {
    mockGetMovieById.mockReturnValue(makeMovie({ status }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.saveCuts('m1', [{ snapId: 's1', order: 0 }]);
    });

    expect(outcome).toEqual({ cutCount: 2, refused: 'frozen' });
    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
  });

  it('lets a failed movie be edited, so a broken generation can be fixed', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'failed' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.saveCuts('m1', [{ snapId: 's1', order: 0 }]);
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalled();
  });
});

describe('appendSnaps', () => {
  it('appends after the existing cuts', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.appendSnaps('m1', ['s3']);
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalledWith('m1', [
      { snapId: 's1', order: 0 },
      { snapId: 's2', order: 1 },
      { snapId: 's3', order: 2 },
    ]);
    expect(outcome).toEqual({ cutCount: 3 });
  });

  it('skips snaps the movie already holds', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.appendSnaps('m1', ['s1', 's2']);
    });

    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
    expect(outcome).toEqual({ cutCount: 2 });
  });

  it('refuses the whole batch when it would not fit', async () => {
    mockGetMovieById.mockReturnValue(
      makeMovie({
        snapRefs: Array.from({ length: 9 }, (_, order) => ({ snapId: `s${order}`, order })),
      }),
    );
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.appendSnaps('m1', ['new-a', 'new-b']);
    });

    expect(outcome).toEqual({ cutCount: 9, refused: 'full' });
    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
  });
});
