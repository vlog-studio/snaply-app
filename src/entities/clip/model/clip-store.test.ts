import { act, renderHook } from '@testing-library/react-native';

import type { Clip } from './clip';
import {
  getClipsByIds,
  useAddClip,
  useClipById,
  useClips,
  useClipStore,
  useRemoveClip,
  useSetClipTags,
} from './clip-store';

// Mock the persistence backend so no native file system is touched.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

function makeClip(overrides: Partial<Clip> = {}): Clip {
  return {
    id: 'clip-1',
    uri: 'file:///doc/recordings/snaply-1.mp4',
    durationSec: 3,
    capturedAt: 1_753_200_000_000,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
    ...overrides,
  };
}

describe('clip store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The store is a module-level singleton; reset it so tests stay independent.
    useClipStore.setState({ clips: [] });
  });

  it('starts empty', async () => {
    const { result } = await renderHook(() => useClips());
    expect(result.current).toEqual([]);
  });

  it('prepends an added clip so the newest is first', async () => {
    const { result } = await renderHook(() => ({ clips: useClips(), addClip: useAddClip() }));

    await act(async () => result.current.addClip(makeClip({ id: 'clip-1' })));
    await act(async () => result.current.addClip(makeClip({ id: 'clip-2' })));

    expect(result.current.clips.map((clip) => clip.id)).toEqual(['clip-2', 'clip-1']);
  });

  it('ignores a duplicate id', async () => {
    const { result } = await renderHook(() => ({ clips: useClips(), addClip: useAddClip() }));

    await act(async () => result.current.addClip(makeClip({ id: 'clip-1' })));
    await act(async () => result.current.addClip(makeClip({ id: 'clip-1', durationSec: 5 })));

    expect(result.current.clips).toHaveLength(1);
    expect(result.current.clips[0].durationSec).toBe(3);
  });

  it('removes a clip by id', async () => {
    const { result } = await renderHook(() => ({
      clips: useClips(),
      addClip: useAddClip(),
      removeClip: useRemoveClip(),
    }));

    await act(async () => result.current.addClip(makeClip({ id: 'clip-1' })));
    await act(async () => result.current.addClip(makeClip({ id: 'clip-2' })));
    await act(async () => result.current.removeClip('clip-1'));

    expect(result.current.clips.map((clip) => clip.id)).toEqual(['clip-2']);
  });

  it('looks up a clip by id and returns undefined for an unknown id', async () => {
    const { result } = await renderHook(() => ({
      addClip: useAddClip(),
      found: useClipById('clip-1'),
      missing: useClipById('nope'),
    }));

    await act(async () => {
      result.current.addClip(makeClip({ id: 'clip-1' }));
    });

    expect(result.current.found?.id).toBe('clip-1');
    expect(result.current.missing).toBeUndefined();
  });

  it('replaces the tags of a clip', async () => {
    const { result } = await renderHook(() => ({
      clips: useClips(),
      addClip: useAddClip(),
      setClipTags: useSetClipTags(),
    }));

    await act(async () => result.current.addClip(makeClip({ id: 'clip-1', tags: ['a'] })));
    await act(async () => result.current.setClipTags('clip-1', ['b', 'c']));

    expect(result.current.clips[0].tags).toEqual(['b', 'c']);
  });

  it('resolves ids to clips in id order, skipping unknown ids', async () => {
    act(() => {
      useClipStore.setState({
        clips: [makeClip({ id: 'clip-1' }), makeClip({ id: 'clip-2' })],
      });
    });

    expect(getClipsByIds(['clip-2', 'nope', 'clip-1']).map((clip) => clip.id)).toEqual([
      'clip-2',
      'clip-1',
    ]);
  });
});
