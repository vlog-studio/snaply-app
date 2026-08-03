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
const mockMovies = jest.fn<Movie[], []>();

jest.mock('@/entities/movie', () => ({
  useMovies: () => mockMovies(),
  useAdvanceMovieJob: () => mockAdvance,
  useFinishMovieJob: () => mockFinish,
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
  useSnapIndex: () => new Map([['s1', { id: 's1', durationSec: 4 }]]),
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
      generatingMovie({ id: 'm2', job: { id: 'job-2', stepIndex: 0, startedAt: startedAt - StepMs } }),
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
