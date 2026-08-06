import { act, renderHook } from '@testing-library/react-native';

import type { Movie } from '@/entities/movie';

import { useShareMovie } from './use-share-movie';

const mockCanShare = jest.fn<Promise<boolean>, []>();
const mockShareFile = jest.fn<Promise<void>, [string, unknown]>();

jest.mock('@/shared/lib/sharing', () => ({
  canShareFiles: () => mockCanShare(),
  shareFile: (uri: string, options: unknown) => mockShareFile(uri, options),
}));

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'm1',
    title: '무비 08-03',
    status: 'ready',
    createdAt: 1_754_000_000_000,
    updatedAt: 1_754_000_000_000,
    snapRefs: [{ snapId: 's1', order: 0 }],
    style: 'calm',
    bgm: 'lofi-walk',
    captions: true,
    ratio: '9:16',
    ...overrides,
  };
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockCanShare.mockResolvedValue(true);
  mockShareFile.mockResolvedValue(undefined);
});

describe('useShareMovie', () => {
  it('opens the share sheet on the rendered file', async () => {
    const movie = makeMovie({
      render: { uri: 'file:///doc/movies/m1.mp4', renderedAt: 1, durationSec: 12 },
    });
    const { result } = await renderHook(() => useShareMovie(movie));

    expect(result.current.blocked).toBeUndefined();
    await act(async () => result.current.share());

    expect(mockShareFile).toHaveBeenCalledWith(
      'file:///doc/movies/m1.mp4',
      expect.objectContaining({ mimeType: 'video/mp4', dialogTitle: '무비 08-03' }),
    );
  });

  it('blocks a movie with no rendered file — which is every movie today', async () => {
    const { result } = await renderHook(() => useShareMovie(makeMovie()));

    expect(result.current.blocked).toBe('no-render');
    await act(async () => result.current.share());

    expect(mockShareFile).not.toHaveBeenCalled();
  });

  it('shares nothing on a platform with no share sheet', async () => {
    mockCanShare.mockResolvedValue(false);
    const movie = makeMovie({
      render: { uri: 'file:///doc/movies/m1.mp4', renderedAt: 1, durationSec: 12 },
    });
    const { result } = await renderHook(() => useShareMovie(movie));

    await act(async () => result.current.share());

    expect(mockShareFile).not.toHaveBeenCalled();
  });

  it('survives a share sheet that throws', async () => {
    // The failure is warned about in dev; the warning is the expected output
    // here, not a test problem, so it is silenced rather than printed.
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockShareFile.mockRejectedValue(new Error('cancelled'));
    const movie = makeMovie({
      render: { uri: 'file:///doc/movies/m1.mp4', renderedAt: 1, durationSec: 12 },
    });
    const { result } = await renderHook(() => useShareMovie(movie));

    await act(async () => result.current.share());

    expect(mockShareFile).toHaveBeenCalled();
  });

  it('blocks when there is no movie at all', async () => {
    const { result } = await renderHook(() => useShareMovie(undefined));

    expect(result.current.blocked).toBe('no-render');
  });
});
