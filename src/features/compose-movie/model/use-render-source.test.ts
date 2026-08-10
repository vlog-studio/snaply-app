import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';

import type { Movie } from '@/entities/movie';

import { useRenderSource } from './use-render-source';

const mockGetEditedVideo = jest.fn();
jest.mock('../api/get-edited-video', () => ({
  getEditedVideo: (...args: unknown[]) => mockGetEditedVideo(...args),
}));

function makeMovie(render?: Movie['render']): Movie {
  return {
    id: 'm1',
    title: '무비',
    status: 'ready',
    createdAt: 1,
    updatedAt: 1,
    snapRefs: [{ snapId: 's1', order: 0 }],
    style: 'daily',
    bgm: 'lofi-walk',
    captions: true,
    ratio: '9:16',
    render,
  };
}

function renderSourceHook(movie: Movie | undefined) {
  // Retries off: the error fallback is the behavior under test, and the
  // default policy would keep it pending across three retries. `gcTime: 0`
  // because the default keeps a five-minute cache timer per query, which
  // holds the Jest process open after the suite ends.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useRenderSource(movie), { wrapper });
}

describe('useRenderSource', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks for a fresh address by the result id and plays the answer', async () => {
    mockGetEditedVideo.mockResolvedValue({ editedUrl: 'https://fresh/e.mp4' });
    const movie = makeMovie({
      uri: 'https://stale/e.mp4',
      videoId: 'result-1',
      renderedAt: 1,
      durationSec: 8,
    });

    const { result } = await renderSourceHook(movie);

    expect(result.current).toEqual({ uri: undefined, resolving: true });
    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(mockGetEditedVideo).toHaveBeenCalledWith('result-1', expect.anything());
    expect(result.current.uri).toBe('https://fresh/e.mp4');
  });

  // A row that lost its file must not resurrect as the stale stored link.
  it('reports no file when the fresh answer carries none', async () => {
    mockGetEditedVideo.mockResolvedValue({});
    const movie = makeMovie({
      uri: 'https://stale/e.mp4',
      videoId: 'result-1',
      renderedAt: 1,
      durationSec: 8,
    });

    const { result } = await renderSourceHook(movie);

    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(result.current.uri).toBeUndefined();
  });

  // Offline, a still-valid stored link plays; an expired one fails in the
  // player, which is no worse than not trying.
  it('falls back to the stored uri when the ask fails', async () => {
    mockGetEditedVideo.mockRejectedValue(new Error('network'));
    const movie = makeMovie({
      uri: 'https://stored/e.mp4',
      videoId: 'result-1',
      renderedAt: 1,
      durationSec: 8,
    });

    const { result } = await renderSourceHook(movie);

    await waitFor(() => expect(result.current.resolving).toBe(false));
    expect(result.current.uri).toBe('https://stored/e.mp4');
  });

  it('uses the stored uri outright for a render that kept no result id', async () => {
    const movie = makeMovie({ uri: 'https://old/e.mp4', renderedAt: 1, durationSec: 8 });

    const { result } = await renderSourceHook(movie);

    expect(result.current).toEqual({ uri: 'https://old/e.mp4', resolving: false });
    expect(mockGetEditedVideo).not.toHaveBeenCalled();
  });

  it('resolves to nothing for a movie without a render', async () => {
    const { result } = await renderSourceHook(makeMovie());

    expect(result.current).toEqual({ uri: undefined, resolving: false });
    expect(mockGetEditedVideo).not.toHaveBeenCalled();
  });
});
