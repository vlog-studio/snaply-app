import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from './movie';
import { useMovieById, useMovies, useMovieStore, useRemoveSnapsEverywhere } from './movie-store';

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
