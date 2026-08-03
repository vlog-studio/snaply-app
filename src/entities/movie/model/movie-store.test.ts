import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from './movie';
import {
  getMovieById,
  useCreateMovie,
  useDeleteMovie,
  useMovieById,
  useMovies,
  useMovieStore,
  useRemoveSnapsEverywhere,
  useRenameMovie,
  useUpdateMovieCuts,
} from './movie-store';

// Mock the persistence backend so no native file system is touched.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

function makeMovie(id: string, snapIds: string[]): Movie {
  return {
    id,
    title: `무비 ${id}`,
    status: 'draft',
    createdAt: 1_753_200_000_000,
    updatedAt: 1_753_200_000_000,
    snapRefs: snapIds.map((snapId, order) => ({ snapId, order })),
    style: 'calm',
    bgm: 'lofi-walk',
    ratio: '9:16',
  };
}

describe('movie store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The store is a module-level singleton; reset it so tests stay independent.
    useMovieStore.setState({ movies: [] });
  });

  it('starts empty', async () => {
    const { result } = await renderHook(() => useMovies());
    expect(result.current).toEqual([]);
  });

  it('finds a movie by id, and answers undefined for an unknown one', async () => {
    useMovieStore.setState({ movies: [makeMovie('m1', ['s1'])] });

    const { result } = await renderHook(() => ({
      found: useMovieById('m1'),
      missing: useMovieById('nope'),
      noId: useMovieById(undefined),
    }));

    expect(result.current.found?.id).toBe('m1');
    expect(result.current.missing).toBeUndefined();
    expect(result.current.noId).toBeUndefined();
  });

  it('strips deleted snaps from every movie that references them', async () => {
    useMovieStore.setState({
      movies: [makeMovie('m1', ['s1', 's2', 's3']), makeMovie('m2', ['s2'])],
    });

    const { result } = await renderHook(() => useRemoveSnapsEverywhere());
    await act(async () => result.current(['s2']));

    const [first, second] = useMovieStore.getState().movies;
    expect(first.snapRefs.map((ref) => ref.snapId)).toEqual(['s1', 's3']);
    expect(second.snapRefs).toEqual([]);
  });

  it('keeps a movie that loses its last cut — deleting a movie is its own action', async () => {
    useMovieStore.setState({ movies: [makeMovie('m1', ['s1'])] });

    const { result } = await renderHook(() => useRemoveSnapsEverywhere());
    await act(async () => result.current(['s1']));

    expect(useMovieStore.getState().movies).toHaveLength(1);
  });

  it('leaves an unaffected movie identical, so its consumers do not re-render', async () => {
    const untouched = makeMovie('m2', ['s9']);
    useMovieStore.setState({ movies: [makeMovie('m1', ['s1']), untouched] });

    const { result } = await renderHook(() => useRemoveSnapsEverywhere());
    await act(async () => result.current(['s1']));

    expect(useMovieStore.getState().movies[1]).toBe(untouched);
  });

  it.each([[[]], [['unknown-snap']]])('leaves every movie untouched for %j', async (snapIds) => {
    const movie = makeMovie('m1', ['s1']);
    useMovieStore.setState({ movies: [movie] });

    const { result } = await renderHook(() => useRemoveSnapsEverywhere());
    await act(async () => result.current(snapIds));

    expect(useMovieStore.getState().movies[0]).toBe(movie);
  });
});

describe('creating a movie', () => {
  const createdAt = new Date(2026, 7, 3, 9).getTime();

  beforeEach(() => {
    useMovieStore.setState({ movies: [] });
  });

  it('starts a draft holding the picked snaps in the given order', async () => {
    const { result } = await renderHook(() => useCreateMovie());

    let movie: Movie | undefined;
    await act(async () => {
      movie = result.current({ snapIds: ['s3', 's1'], createdAt });
    });

    expect(movie).toMatchObject({
      status: 'draft',
      ratio: '9:16',
      createdAt,
      updatedAt: createdAt,
    });
    expect(movie?.snapRefs).toEqual([
      { snapId: 's3', order: 0 },
      { snapId: 's1', order: 1 },
    ]);
    expect(useMovieStore.getState().movies).toHaveLength(1);
  });

  it('names a movie after the day it was started, and keeps a given name', async () => {
    const { result } = await renderHook(() => useCreateMovie());

    let auto: Movie | undefined;
    let named: Movie | undefined;
    await act(async () => {
      auto = result.current({ snapIds: ['s1'], createdAt });
      named = result.current({ snapIds: ['s2'], title: '제주 이틀', createdAt });
    });

    expect(auto?.title).toBe('무비 08-03');
    expect(named?.title).toBe('제주 이틀');
  });

  it('gives two movies started in the same millisecond distinct ids and titles', async () => {
    const { result } = await renderHook(() => useCreateMovie());

    let first: Movie | undefined;
    let second: Movie | undefined;
    await act(async () => {
      first = result.current({ snapIds: ['s1'], createdAt });
      second = result.current({ snapIds: ['s2'], createdAt });
    });

    expect(second?.id).not.toBe(first?.id);
    expect(second?.title).toBe('무비 08-03 (2)');
  });

  it('reads back by id without subscribing', async () => {
    const { result } = await renderHook(() => useCreateMovie());
    let movie: Movie | undefined;
    await act(async () => {
      movie = result.current({ snapIds: ['s1'], createdAt });
    });

    expect(getMovieById(movie!.id)?.id).toBe(movie!.id);
    expect(getMovieById('nope')).toBeUndefined();
  });
});

describe('editing a movie', () => {
  beforeEach(() => {
    useMovieStore.setState({ movies: [makeMovie('m1', ['s1', 's2'])] });
  });

  it('replaces the whole cut list and stamps the edit', async () => {
    const { result } = await renderHook(() => useUpdateMovieCuts());

    await act(async () =>
      result.current('m1', [{ snapId: 's2', order: 0, trim: { startSec: 1, endSec: 3 } }], 999),
    );

    const [movie] = useMovieStore.getState().movies;
    expect(movie.snapRefs).toEqual([{ snapId: 's2', order: 0, trim: { startSec: 1, endSec: 3 } }]);
    expect(movie.updatedAt).toBe(999);
  });

  it('renames a movie', async () => {
    const { result } = await renderHook(() => useRenameMovie());

    await act(async () => result.current('m1', '제주 이틀', 999));

    expect(useMovieStore.getState().movies[0]).toMatchObject({
      title: '제주 이틀',
      updatedAt: 999,
    });
  });

  it('deletes a movie', async () => {
    const { result } = await renderHook(() => useDeleteMovie());

    await act(async () => result.current('m1'));

    expect(useMovieStore.getState().movies).toEqual([]);
  });

  it.each(['updateMovieCuts', 'renameMovie'] as const)(
    'ignores %s for an unknown movie',
    async (action) => {
      const before = useMovieStore.getState().movies;
      await act(async () => {
        if (action === 'updateMovieCuts') {
          useMovieStore.getState().updateMovieCuts('nope', [], 1);
        } else {
          useMovieStore.getState().renameMovie('nope', 'x', 1);
        }
      });

      expect(useMovieStore.getState().movies[0]).toBe(before[0]);
    },
  );
});
