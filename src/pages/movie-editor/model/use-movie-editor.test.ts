import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';
import type { Snap } from '@/entities/snap';

import { useMovieEditor } from './use-movie-editor';

const mockMovie = jest.fn<Movie | undefined, []>();
const mockSaveCuts = jest.fn();
const mockSnaps = jest.fn<Snap[], []>();

jest.mock('@/entities/movie', () => {
  // The trim rules are the entity's own and tested there; the editor is about
  // which of them it applies and what it stages locally.
  const trim = jest.requireActual('@/entities/movie/lib/movie-trim');
  return {
    MovieSnapLimit: 10,
    useMovieById: () => mockMovie(),
    cutDurationSec: trim.cutDurationSec,
    cutsDurationSec: trim.cutsDurationSec,
    withTrim: trim.withTrim,
    withoutTrim: trim.withoutTrim,
  };
});
jest.mock('@/entities/snap', () => ({
  useSnapIndex: () => new Map(mockSnaps().map((snap: Snap) => [snap.id, snap])),
}));
jest.mock('@/features/compose-movie', () => ({
  useComposeMovie: () => ({ saveCuts: mockSaveCuts }),
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
    status: 'draft',
    createdAt: 1,
    updatedAt: 1,
    snapRefs: [
      { snapId: 's1', order: 0 },
      { snapId: 's2', order: 1 },
      { snapId: 's3', order: 2 },
    ],
    style: 'calm',
    bgm: 'lofi-walk',
    captions: true,
    ratio: '9:16',
    ...overrides,
  };
}

function cutIds(cuts: { ref: { snapId: string } }[]) {
  return cuts.map((cut) => cut.ref.snapId);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMovie.mockReturnValue(makeMovie());
  mockSnaps.mockReturnValue([makeSnap('s1', 3), makeSnap('s2', 5), makeSnap('s3', 4)]);
  mockSaveCuts.mockReturnValue({ cutCount: 3 });
});

describe('useMovieEditor', () => {
  it('resolves the cut list in stored order and sums its length', async () => {
    mockMovie.mockReturnValue(
      makeMovie({
        snapRefs: [
          { snapId: 's3', order: 2 },
          { snapId: 's1', order: 0 },
          { snapId: 's2', order: 1 },
        ],
      }),
    );

    const { result } = await renderHook(() => useMovieEditor('m1'));

    expect(cutIds(result.current.cuts)).toEqual(['s1', 's2', 's3']);
    expect(result.current.totalSec).toBe(12);
    expect(result.current.isDirty).toBe(false);
  });

  it('keeps a row whose original was deleted, so the user can remove it', async () => {
    mockSnaps.mockReturnValue([makeSnap('s1'), makeSnap('s3')]);

    const { result } = await renderHook(() => useMovieEditor('m1'));

    expect(result.current.cuts).toHaveLength(3);
    expect(result.current.cuts[1].snap).toBeUndefined();
  });

  it('moves a cut and marks the list dirty without writing', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(0, 1));

    expect(cutIds(result.current.cuts)).toEqual(['s2', 's1', 's3']);
    expect(result.current.isDirty).toBe(true);
    expect(mockSaveCuts).not.toHaveBeenCalled();
  });

  it.each([
    ['first cut up', 0, -1 as const],
    ['last cut down', 2, 1 as const],
  ])('ignores moving the %s', async (_label, index, direction) => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(index, direction));

    expect(cutIds(result.current.cuts)).toEqual(['s1', 's2', 's3']);
    expect(result.current.isDirty).toBe(false);
  });

  it('removes a cut', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.removeCut(1));

    expect(cutIds(result.current.cuts)).toEqual(['s1', 's3']);
  });

  it('refuses to remove the last cut', async () => {
    mockMovie.mockReturnValue(makeMovie({ snapRefs: [{ snapId: 's1', order: 0 }] }));
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.removeCut(0));

    expect(result.current.cuts).toHaveLength(1);
    expect(result.current.refusal).toBe('empty');
  });

  it('commits the working list through the compose feature', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(0, 1));
    await act(async () => result.current.save());

    expect(mockSaveCuts).toHaveBeenCalledWith('m1', [
      { snapId: 's2', order: 1 },
      { snapId: 's1', order: 0 },
      { snapId: 's3', order: 2 },
    ]);
  });

  it('surfaces a refusal and keeps the working list so it can be fixed', async () => {
    mockSaveCuts.mockReturnValue({ cutCount: 3, refused: 'frozen' });
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(0, 1));
    await act(async () => result.current.save());

    expect(result.current.refusal).toBe('frozen');
    expect(cutIds(result.current.cuts)).toEqual(['s2', 's1', 's3']);
  });

  it('drops local edits on discard', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(0, 1));
    await act(async () => result.current.discard());

    expect(cutIds(result.current.cuts)).toEqual(['s1', 's2', 's3']);
    expect(result.current.isDirty).toBe(false);
  });

  it('abandons the working list when the stored cuts change underneath', async () => {
    const { result, rerender } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(0, 1));
    expect(result.current.isDirty).toBe(true);

    // A save landing, or a snap deleted elsewhere, replaces the stored list.
    mockMovie.mockReturnValue(
      makeMovie({
        snapRefs: [
          { snapId: 's2', order: 0 },
          { snapId: 's1', order: 1 },
        ],
      }),
    );
    await act(async () => rerender({}));

    expect(cutIds(result.current.cuts)).toEqual(['s2', 's1']);
    expect(result.current.isDirty).toBe(false);
  });

  it.each(['generating', 'ready'] as const)('reports a %s movie as read-only', async (status) => {
    mockMovie.mockReturnValue(makeMovie({ status }));

    const { result } = await renderHook(() => useMovieEditor('m1'));

    expect(result.current.canEdit).toBe(false);
  });

  it('answers that there is nothing to commit when the list is untouched', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    let moveOn;
    await act(async () => {
      moveOn = result.current.save();
    });

    expect(moveOn).toBe(true);
    expect(mockSaveCuts).not.toHaveBeenCalled();
  });

  it('answers false for a refused commit, so the editor stays on the step', async () => {
    mockSaveCuts.mockReturnValue({ cutCount: 3, refused: 'frozen' });
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.moveCut(0, 1));
    let moveOn;
    await act(async () => {
      moveOn = result.current.save();
    });

    expect(moveOn).toBe(false);
  });
});

describe('trimming a cut', () => {
  it('shortens a cut and shortens the movie with it', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    // s2 is five seconds long.
    await act(async () => result.current.trimCut(1, 1, 3.5));

    expect(result.current.cuts[1].ref.trim).toEqual({ startSec: 1, endSec: 3.5 });
    expect(result.current.cuts[1].usedSec).toBe(2.5);
    // 3 + 2.5 + 4, where s2 was contributing five.
    expect(result.current.totalSec).toBe(9.5);
    expect(result.current.isDirty).toBe(true);
  });

  it('holds a window inside the snap and above the minimum cut length', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.trimCut(0, -4, 99));

    // s1 is three seconds; the window widens to the whole snap, so no trim.
    expect(result.current.cuts[0].ref.trim).toBeUndefined();
  });

  it('puts a cut back to playing whole', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.trimCut(1, 1, 3));
    await act(async () => result.current.resetTrim(1));

    expect(result.current.cuts[1].ref.trim).toBeUndefined();
    expect(result.current.cuts[1].usedSec).toBe(5);
  });

  it('does not dirty the list for a drag that settled where it started', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.trimCut(1, 0, 5));

    expect(result.current.isDirty).toBe(false);
  });

  it('ignores a trim on a cut whose original was deleted', async () => {
    mockSnaps.mockReturnValue([makeSnap('s1'), makeSnap('s3')]);
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.trimCut(1, 1, 2));

    expect(result.current.cuts[1].ref.trim).toBeUndefined();
    expect(result.current.isDirty).toBe(false);
  });

  it('commits the trim with the cut list', async () => {
    const { result } = await renderHook(() => useMovieEditor('m1'));

    await act(async () => result.current.trimCut(0, 0.5, 2.5));
    await act(async () => result.current.save());

    expect(mockSaveCuts).toHaveBeenCalledWith('m1', [
      { snapId: 's1', order: 0, trim: { startSec: 0.5, endSec: 2.5 } },
      { snapId: 's2', order: 1 },
      { snapId: 's3', order: 2 },
    ]);
  });
});
