import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';

import { useGenerationRunner } from './use-generation-runner';

// The step table and the progress rule are the entity's, and they are tested
// there; the runner is mocked against a two-step job so this suite is about what
// it writes and when it looks again, not about the timing table.
const StepMs = 1_000;
const TotalMs = 2 * StepMs;

const mockAdvance = jest.fn();
const mockFinish = jest.fn();
const mockFail = jest.fn();
const mockMovies = jest.fn<Movie[], []>();
const mockSnapIndex = jest.fn<Map<string, { id: string; durationSec: number }>, []>();
const mockSnapsHydrated = jest.fn<boolean, []>();
const mockAnnounce = jest.fn();

jest.mock('@/entities/movie', () => ({
  useMovies: () => mockMovies(),
  useAdvanceMovieJob: () => mockAdvance,
  useFinishMovieJob: () => mockFinish,
  useFailMovieJob: () => mockFail,
  cutsDurationSec: (refs: { snapId: string }[], lookup: (id: string) => number | undefined) =>
    refs.reduce((total, ref) => total + (lookup(ref.snapId) ?? 0), 0),
  movieJobProgressAt: (startedAt: number, now: number) => {
    const elapsed = Math.max(now - startedAt, 0);
    if (elapsed >= TotalMs) return { stepIndex: 1, ratio: 1, isDone: true };
    const stepIndex = Math.floor(elapsed / StepMs);
    return {
      stepIndex,
      ratio: elapsed / TotalMs,
      isDone: false,
      nextStepAt: startedAt + (stepIndex + 1) * StepMs,
    };
  },
}));

jest.mock('@/entities/snap', () => ({
  useSnapIndex: () => mockSnapIndex(),
  useSnapsHydrated: () => mockSnapsHydrated(),
}));

jest.mock('../lib/announce-job-end', () => ({
  announceJobEnd: (...args: unknown[]) => mockAnnounce(...args),
}));

const startedAt = 1_754_000_000_000;

function generatingMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'm1',
    title: '무비',
    status: 'generating',
    createdAt: startedAt,
    updatedAt: startedAt,
    snapRefs: [{ snapId: 's1', order: 0 }],
    style: 'calm',
    bgm: 'lofi-walk',
    captions: true,
    ratio: '9:16',
    job: { id: 'job-1', stepIndex: 0, startedAt },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(startedAt);
  mockMovies.mockReturnValue([]);
  mockSnapIndex.mockReturnValue(new Map([['s1', { id: 's1', durationSec: 4 }]]));
  mockSnapsHydrated.mockReturnValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useGenerationRunner', () => {
  it('writes the step a running job has reached', async () => {
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockAdvance).toHaveBeenCalledWith('m1', 0);
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('looks again at the next step boundary and writes the new step', async () => {
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(StepMs);
    });

    expect(mockAdvance).toHaveBeenLastCalledWith('m1', 1);
  });

  it('finishes the job with a render measured from the cuts', async () => {
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(TotalMs);
    });

    expect(mockFinish).toHaveBeenCalledWith('m1', {
      renderedAt: startedAt + TotalMs,
      durationSec: 4,
    });
  });

  it('finishes a job whose whole duration passed while the app was closed', async () => {
    // Resume: the job started long ago and the app is only now mounting again.
    jest.setSystemTime(startedAt + TotalMs * 50);
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockFinish).toHaveBeenCalledWith('m1', expect.objectContaining({ durationSec: 4 }));
    expect(mockAdvance).not.toHaveBeenCalled();
  });

  it('carries several jobs at once', async () => {
    mockMovies.mockReturnValue([
      generatingMovie(),
      generatingMovie({
        id: 'm2',
        job: { id: 'job-2', stepIndex: 0, startedAt: startedAt - StepMs },
      }),
    ]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockAdvance).toHaveBeenCalledWith('m1', 0);
    expect(mockAdvance).toHaveBeenCalledWith('m2', 1);
  });

  it.each(['draft', 'ready', 'failed'] as const)('leaves a %s movie alone', async (status) => {
    mockMovies.mockReturnValue([generatingMovie({ status, job: undefined })]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(TotalMs * 2);
    });

    expect(mockAdvance).not.toHaveBeenCalled();
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('fails a job whose originals were all deleted, without waiting it out', async () => {
    mockSnapIndex.mockReturnValue(new Map());
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockFail).toHaveBeenCalledWith('m1', expect.stringContaining('스냅 원본'));
    expect(mockFinish).not.toHaveBeenCalled();
    expect(mockAdvance).not.toHaveBeenCalled();
  });

  it('waits for the snap library before judging whether a job lost its material', async () => {
    // Pre-hydration every cut looks deleted; failing here would kill every job
    // in flight on the first tick of an app start.
    mockSnapsHydrated.mockReturnValue(false);
    mockSnapIndex.mockReturnValue(new Map());
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(TotalMs * 2);
    });

    expect(mockFail).not.toHaveBeenCalled();
    expect(mockFinish).not.toHaveBeenCalled();
  });

  it('says nothing when the completion notification is off', async () => {
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner());

    await act(async () => {
      jest.advanceTimersByTime(TotalMs);
    });

    expect(mockAnnounce).not.toHaveBeenCalled();
  });

  it('announces a job that finished while the user was elsewhere', async () => {
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner({ announce: true }));

    await act(async () => {
      jest.advanceTimersByTime(TotalMs);
    });

    expect(mockAnnounce).toHaveBeenCalledWith('ready', expect.objectContaining({ id: 'm1' }));
  });

  it('announces a failure too, so a broken job is not silent', async () => {
    mockSnapIndex.mockReturnValue(new Map());
    mockMovies.mockReturnValue([generatingMovie()]);
    await renderHook(() => useGenerationRunner({ announce: true }));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockAnnounce).toHaveBeenCalledWith(
      'failed',
      expect.objectContaining({ id: 'm1' }),
      expect.any(String),
    );
  });

  it('stops looking once it is unmounted', async () => {
    mockMovies.mockReturnValue([generatingMovie()]);
    const { unmount } = await renderHook(() => useGenerationRunner());
    await act(async () => {
      jest.advanceTimersByTime(0);
    });
    mockAdvance.mockClear();

    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(TotalMs * 2);
    });

    expect(mockAdvance).not.toHaveBeenCalled();
    expect(mockFinish).not.toHaveBeenCalled();
  });
});
