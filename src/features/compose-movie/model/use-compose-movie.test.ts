import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';

import { useComposeMovie } from './use-compose-movie';

const mockCreateMovie = jest.fn();
const mockUpdateMovieCuts = jest.fn();
const mockUpdateMovieStyle = jest.fn();
const mockBeginMovieJob = jest.fn();
const mockSetMovieArranger = jest.fn();
const mockClearTray = jest.fn();
const mockGetMovieById = jest.fn<Movie | undefined, [string]>();
const mockTraySnapIds = jest.fn<string[], []>();
const mockSnapIndex = jest.fn<[string, { capturedAt: number }][], []>();

// Mock each dependency at its slice Public API so the test stays at the seam.
jest.mock('@/entities/movie', () => {
  // The arrangement predicates are the entity's own and tested there; this suite
  // is about which of them the rules apply and what they then write.
  const arrangement = jest.requireActual('@/entities/movie/lib/movie-arrangement');
  return {
    MovieSnapLimit: 10,
    getMovieById: (id: string) => mockGetMovieById(id),
    isAiArranged: arrangement.isAiArranged,
    sameArrangement: arrangement.sameArrangement,
    useCreateMovie: () => mockCreateMovie,
    useUpdateMovieCuts: () => mockUpdateMovieCuts,
    useUpdateMovieStyle: () => mockUpdateMovieStyle,
    useSetMovieArranger: () => mockSetMovieArranger,
    useBeginMovieJob: () => mockBeginMovieJob,
  };
});
jest.mock('@/entities/snap', () => ({
  useSnapIndex: () => new Map(mockSnapIndex()),
}));
jest.mock('@/entities/tray', () => ({
  useTraySnapIds: () => mockTraySnapIds(),
  useClearTray: () => mockClearTray,
}));

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
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTraySnapIds.mockReturnValue([]);
  mockSnapIndex.mockReturnValue([
    ['s1', { capturedAt: 100 }],
    ['s2', { capturedAt: 200 }],
  ]);
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

    expect(mockCreateMovie).toHaveBeenCalledWith({ snapIds: ['s3', 's1'], arranger: 'user' });
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

describe('startMovieFromTemplate', () => {
  it('creates an AI-arranged movie with the template’s look', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startMovieFromTemplate({
        snapIds: ['s2', 's1'],
        style: 'upbeat',
        bgm: 'sunny-side',
      });
    });

    expect(mockCreateMovie).toHaveBeenCalledWith({
      snapIds: ['s2', 's1'],
      style: 'upbeat',
      bgm: 'sunny-side',
      arranger: 'ai',
    });
  });

  it('leaves the tray alone, so gathering by hand survives a template', async () => {
    mockTraySnapIds.mockReturnValue(['kept']);
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startMovieFromTemplate({ snapIds: ['s1'], style: 'calm', bgm: 'silence' });
    });

    expect(mockClearTray).not.toHaveBeenCalled();
  });

  it('makes nothing from a template with every slot empty', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let movie;
    await act(async () => {
      movie = result.current.startMovieFromTemplate({ snapIds: [], style: 'calm', bgm: 'silence' });
    });

    expect(movie).toBeUndefined();
    expect(mockCreateMovie).not.toHaveBeenCalled();
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

  it('refuses a generating movie, which a job owns right now', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'generating' }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.saveCuts('m1', [{ snapId: 's1', order: 0 }]);
    });

    expect(outcome).toEqual({ cutCount: 2, refused: 'frozen' });
    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
  });

  it('lets a draft be edited, so the composition is settled before the run', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'draft' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.saveCuts('m1', [{ snapId: 's1', order: 0 }]);
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalled();
  });

  it('lets a failed movie be edited, so a broken generation can be fixed', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'failed' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.saveCuts('m1', [{ snapId: 's1', order: 0 }]);
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalled();
  });

  it('takes the order off the AI when the user rearranges an AI-arranged movie', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ arranger: 'ai' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.saveCuts('m1', [
        { snapId: 's2', order: 0 },
        { snapId: 's1', order: 1 },
      ]);
    });

    expect(mockSetMovieArranger).toHaveBeenCalledWith('m1', 'user');
  });

  it('leaves the AI its order when only a trim changed', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ arranger: 'ai' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.saveCuts('m1', [
        { snapId: 's1', order: 0, trim: { startSec: 0.5, endSec: 2 } },
        { snapId: 's2', order: 1 },
      ]);
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalled();
    expect(mockSetMovieArranger).not.toHaveBeenCalled();
  });

  it('never writes an arranger for a movie that was already the user’s', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.saveCuts('m1', [
        { snapId: 's2', order: 0 },
        { snapId: 's1', order: 1 },
      ]);
    });

    expect(mockSetMovieArranger).not.toHaveBeenCalled();
  });
});

describe('setArranger', () => {
  it('hands the order back to the AI', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ arranger: 'user' }));
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.setArranger('m1', 'ai');
    });

    expect(applied).toBe(true);
    expect(mockSetMovieArranger).toHaveBeenCalledWith('m1', 'ai');
  });

  it('refuses a movie a job owns right now', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'generating' }));
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.setArranger('m1', 'ai');
    });

    expect(applied).toBe(false);
    expect(mockSetMovieArranger).not.toHaveBeenCalled();
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

describe('saveStyle', () => {
  it('writes the settings it is given', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.saveStyle('m1', { style: 'upbeat' });
    });

    expect(mockUpdateMovieStyle).toHaveBeenCalledWith('m1', { style: 'upbeat' });
    expect(applied).toBe(true);
  });

  it('writes the settings of a draft, so the look is settled before the run', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'draft' }));
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.saveStyle('m1', { style: 'upbeat' });
    });

    expect(applied).toBe(true);
    expect(mockUpdateMovieStyle).toHaveBeenCalledWith('m1', { style: 'upbeat' });
  });

  it('refuses a generating movie', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'generating' }));
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.saveStyle('m1', { style: 'upbeat' });
    });

    expect(applied).toBe(false);
    expect(mockUpdateMovieStyle).not.toHaveBeenCalled();
  });
});

describe('startGeneration', () => {
  it('hands a draft to a job', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'draft' }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.startGeneration('m1');
    });

    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1');
    expect(outcome).toEqual({ started: true });
  });

  it('runs a failed movie again', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'failed', error: '터졌어요' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startGeneration('m1');
    });

    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1');
  });

  it('refuses a movie with nothing to generate from', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ snapRefs: [] }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: false, refused: 'empty' });
    expect(mockBeginMovieJob).not.toHaveBeenCalled();
  });

  it('runs a finished movie again, which is what regeneration is', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: true });
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1');
  });

  it('refuses a movie a job is already running on', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'generating' }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: false, refused: 'frozen' });
    expect(mockBeginMovieJob).not.toHaveBeenCalled();
  });

  it('arranges an AI-arranged movie by capture time before running it', async () => {
    mockGetMovieById.mockReturnValue(
      makeMovie({
        arranger: 'ai',
        // The user appended s1 after s2, but s1 was shot first.
        snapRefs: [
          { snapId: 's2', order: 0 },
          { snapId: 's1', order: 1 },
        ],
      }),
    );
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startGeneration('m1');
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalledWith('m1', [
      { snapId: 's1', order: 0 },
      { snapId: 's2', order: 1 },
    ]);
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1');
  });

  it('leaves a user-arranged movie in the order the user left it', async () => {
    mockGetMovieById.mockReturnValue(
      makeMovie({
        arranger: 'user',
        snapRefs: [
          { snapId: 's2', order: 0 },
          { snapId: 's1', order: 1 },
        ],
      }),
    );
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startGeneration('m1');
    });

    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1');
  });

  it('does not rearrange when a cut’s original is gone, which would drop it', async () => {
    mockSnapIndex.mockReturnValue([['s2', { capturedAt: 200 }]]);
    mockGetMovieById.mockReturnValue(
      makeMovie({
        arranger: 'ai',
        snapRefs: [
          { snapId: 's2', order: 0 },
          { snapId: 's1', order: 1 },
        ],
      }),
    );
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startGeneration('m1');
    });

    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1');
  });

  it('refuses a movie that is gone', async () => {
    mockGetMovieById.mockReturnValue(undefined);
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = result.current.startGeneration('gone');
    });

    expect(outcome).toEqual({ started: false, refused: 'frozen' });
  });
});
