import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';

import { useComposeMovie } from './use-compose-movie';

const { ApiError } = jest.requireMock('@/shared/api') as {
  ApiError: new (message: string, status?: number) => Error & { status?: number };
};

const mockCreateMovie = jest.fn();
const mockUpdateMovieCuts = jest.fn();
const mockUpdateMovieStyle = jest.fn();
const mockBeginMovieJob = jest.fn();
const mockSetMovieArranger = jest.fn();
const mockClearTray = jest.fn();
const mockGetMovieById = jest.fn<Movie | undefined, [string]>();
const mockTraySnapIds = jest.fn<string[], []>();
const mockSnapIndex = jest.fn<[string, { capturedAt: number }][], []>();
const mockSyncEntries = jest.fn<Record<string, { status: string; videoId?: string }>, []>();
const mockCreateEditJob = jest.fn();

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
  getSnapSyncEntries: () => mockSyncEntries(),
}));
jest.mock('@/shared/api', () => ({
  ApiError: class ApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  },
}));
jest.mock('../api/create-edit-job', () => ({
  createEditJob: (...args: unknown[]) => mockCreateEditJob(...args),
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
    style: 'daily',
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
  // Both cuts have reached the backend, which is what a run needs.
  mockSyncEntries.mockReturnValue({
    s1: { status: 'uploaded', videoId: 'v1' },
    s2: { status: 'uploaded', videoId: 'v2' },
  });
  mockCreateEditJob.mockResolvedValue('job-1');
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
        style: 'travel',
        bgm: 'sunny-side',
      });
    });

    expect(mockCreateMovie).toHaveBeenCalledWith({
      snapIds: ['s2', 's1'],
      style: 'travel',
      bgm: 'sunny-side',
      arranger: 'ai',
    });
  });

  it('leaves the tray alone, so gathering by hand survives a template', async () => {
    mockTraySnapIds.mockReturnValue(['kept']);
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      result.current.startMovieFromTemplate({ snapIds: ['s1'], style: 'daily', bgm: 'silence' });
    });

    expect(mockClearTray).not.toHaveBeenCalled();
  });

  it('makes nothing from a template with every slot empty', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let movie;
    await act(async () => {
      movie = result.current.startMovieFromTemplate({ snapIds: [], style: 'daily', bgm: 'silence' });
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
      applied = result.current.saveStyle('m1', { style: 'travel' });
    });

    expect(mockUpdateMovieStyle).toHaveBeenCalledWith('m1', { style: 'travel' });
    expect(applied).toBe(true);
  });

  it('writes the settings of a draft, so the look is settled before the run', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'draft' }));
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.saveStyle('m1', { style: 'travel' });
    });

    expect(applied).toBe(true);
    expect(mockUpdateMovieStyle).toHaveBeenCalledWith('m1', { style: 'travel' });
  });

  it('refuses a generating movie', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'generating' }));
    const { result } = await renderHook(() => useComposeMovie());

    let applied;
    await act(async () => {
      applied = result.current.saveStyle('m1', { style: 'travel' });
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
      outcome = await result.current.startGeneration('m1');
    });

    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1', 'job-1');
    expect(outcome).toEqual({ started: true });
  });

  it('runs a failed movie again', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'failed', error: '터졌어요' }));
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      await result.current.startGeneration('m1');
    });

    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1', 'job-1');
  });

  it('refuses a movie with nothing to generate from', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ snapRefs: [] }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: false, refused: 'empty' });
    expect(mockBeginMovieJob).not.toHaveBeenCalled();
  });

  it('runs a finished movie again, which is what regeneration is', async () => {
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: true });
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1', 'job-1');
  });

  it('refuses a movie a job is already running on', async () => {
    mockGetMovieById.mockReturnValue(makeMovie({ status: 'generating' }));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('m1');
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
      await result.current.startGeneration('m1');
    });

    expect(mockUpdateMovieCuts).toHaveBeenCalledWith('m1', [
      { snapId: 's1', order: 0 },
      { snapId: 's2', order: 1 },
    ]);
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1', 'job-1');
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
      await result.current.startGeneration('m1');
    });

    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1', 'job-1');
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
      await result.current.startGeneration('m1');
    });

    expect(mockUpdateMovieCuts).not.toHaveBeenCalled();
    expect(mockBeginMovieJob).toHaveBeenCalledWith('m1', 'job-1');
  });

  it('refuses a movie that is gone', async () => {
    mockGetMovieById.mockReturnValue(undefined);
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('gone');
    });

    expect(outcome).toEqual({ started: false, refused: 'frozen' });
  });

  it('sends the cuts in cut order, which is the only channel the order has', async () => {
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
      await result.current.startGeneration('m1');
    });

    expect(mockCreateEditJob).toHaveBeenCalledWith({
      clips: [{ videoId: 'v2' }, { videoId: 'v1' }],
      style: 'daily',
    });
  });

  // What the user shortened on the timeline is what the run renders — the trim
  // travels with the cut it belongs to, not as a separate list to line up.
  it('sends each cut’s trim window with it', async () => {
    mockGetMovieById.mockReturnValue(
      makeMovie({
        arranger: 'user',
        snapRefs: [
          { snapId: 's1', order: 0, trim: { startSec: 0.5, endSec: 2 } },
          { snapId: 's2', order: 1 },
        ],
      }),
    );
    const { result } = await renderHook(() => useComposeMovie());

    await act(async () => {
      await result.current.startGeneration('m1');
    });

    expect(mockCreateEditJob).toHaveBeenCalledWith({
      clips: [{ videoId: 'v1', trim: { startSec: 0.5, endSec: 2 } }, { videoId: 'v2' }],
      style: 'daily',
    });
  });

  // The run is made from the server's copies, and `POST /edit-jobs` refuses the
  // whole batch when one is missing — so this is answered before the request.
  it.each([
    ['still uploading', { status: 'uploading' }],
    ['a failed upload', { status: 'failed', attempts: 1 }],
    ['never uploaded', undefined],
  ])('refuses a movie with a cut that is %s', async (_label, entry) => {
    mockSyncEntries.mockReturnValue({
      s1: { status: 'uploaded', videoId: 'v1' },
      ...(entry ? { s2: entry } : null),
    } as Record<string, { status: string; videoId?: string }>);
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: false, refused: 'uploading' });
    expect(mockCreateEditJob).not.toHaveBeenCalled();
    expect(mockBeginMovieJob).not.toHaveBeenCalled();
  });

  // A 403 is an ownership problem or the free plan's cap, and only the message
  // says which — so it is carried through rather than reworded.
  it('reports the backend’s own words when it refuses the run', async () => {
    const reason = '\uBB34\uB8CC \uD50C\uB79C\uC740 \uC6D4 3\uD3B8\uAE4C\uC9C0 \uD3B8\uC9D1\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.';
    // 무료 플랜은 월 3편까지 편집할 수 있습니다.
    mockCreateEditJob.mockRejectedValue(new ApiError(reason, 403));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: false, refused: 'rejected', message: reason });
    expect(mockBeginMovieJob).not.toHaveBeenCalled();
  });

  it('leaves the movie untouched when the request itself fails', async () => {
    mockCreateEditJob.mockRejectedValue(new ApiError('network', undefined));
    const { result } = await renderHook(() => useComposeMovie());

    let outcome;
    await act(async () => {
      outcome = await result.current.startGeneration('m1');
    });

    expect(outcome).toEqual({ started: false, refused: 'unreachable' });
    expect(mockBeginMovieJob).not.toHaveBeenCalled();
  });
});
