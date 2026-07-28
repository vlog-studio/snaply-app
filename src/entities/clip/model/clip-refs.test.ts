import { renderHook } from '@testing-library/react-native';

import type { Clip } from './clip';
import { clipsByRefs, useClipIndex, useClipsByRefs } from './clip-refs';
import { useClipStore } from './clip-store';

// Mock the persistence backend so no native file system is touched.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

function makeClip(id: string): Clip {
  return {
    id,
    uri: `file:///doc/recordings/${id}.mp4`,
    durationSec: 3,
    capturedAt: 1_753_200_000_000,
    width: 1080,
    height: 1920,
    orientation: 'portrait',
    tags: [],
  };
}

const c1 = makeClip('c1');
const c2 = makeClip('c2');
const c3 = makeClip('c3');

function indexOf(...clips: Clip[]) {
  return new Map(clips.map((clip) => [clip.id, clip]));
}

function ids(clips: Clip[]) {
  return clips.map((clip) => clip.id);
}

describe('clipsByRefs', () => {
  it('orders the resolved clips by each reference order, not by reference position', () => {
    const refs = [
      { clipId: 'c3', order: 2 },
      { clipId: 'c1', order: 0 },
      { clipId: 'c2', order: 1 },
    ];

    expect(ids(clipsByRefs(refs, indexOf(c1, c2, c3)))).toEqual(['c1', 'c2', 'c3']);
  });

  it('skips a reference whose clip is gone from the archive', () => {
    const refs = [
      { clipId: 'c1', order: 0 },
      { clipId: 'deleted', order: 1 },
      { clipId: 'c2', order: 2 },
    ];

    expect(ids(clipsByRefs(refs, indexOf(c1, c2)))).toEqual(['c1', 'c2']);
  });

  it('treats order as a sort key only, so gaps resolve the same way', () => {
    const refs = [
      { clipId: 'c2', order: 40 },
      { clipId: 'c1', order: 7 },
    ];

    expect(ids(clipsByRefs(refs, indexOf(c1, c2)))).toEqual(['c1', 'c2']);
  });

  it('leaves the caller-supplied references untouched', () => {
    const refs = [
      { clipId: 'c2', order: 1 },
      { clipId: 'c1', order: 0 },
    ];

    clipsByRefs(refs, indexOf(c1, c2));

    expect(refs.map((ref) => ref.clipId)).toEqual(['c2', 'c1']);
  });

  it.each([
    ['no references', []],
    ['undefined references', undefined],
  ])('resolves %s to the same empty result', (_label, refs) => {
    const first = clipsByRefs(refs, indexOf(c1));
    const second = clipsByRefs(refs, indexOf(c1));

    expect(first).toEqual([]);
    // A stable empty array, so an empty roll does not re-render its consumers.
    expect(first).toBe(second);
  });

  it('resolves to nothing when the archive holds none of the referenced clips', () => {
    expect(clipsByRefs([{ clipId: 'c1', order: 0 }], indexOf())).toEqual([]);
  });
});

describe('useClipIndex', () => {
  beforeEach(() => {
    useClipStore.setState({ clips: [] });
  });

  it('indexes the whole archive by clip id', async () => {
    useClipStore.setState({ clips: [c1, c2] });

    const { result } = await renderHook(() => useClipIndex());

    expect(result.current.get('c1')).toBe(c1);
    expect(result.current.get('c2')).toBe(c2);
    expect(result.current.size).toBe(2);
  });
});

describe('useClipsByRefs', () => {
  beforeEach(() => {
    useClipStore.setState({ clips: [] });
  });

  it('resolves references against the live archive, in order', async () => {
    useClipStore.setState({ clips: [c2, c1] });

    const { result } = await renderHook(() =>
      useClipsByRefs([
        { clipId: 'c2', order: 1 },
        { clipId: 'c1', order: 0 },
      ]),
    );

    expect(ids(result.current)).toEqual(['c1', 'c2']);
  });

  it('skips a reference the archive no longer holds', async () => {
    useClipStore.setState({ clips: [c1] });

    const { result } = await renderHook(() =>
      useClipsByRefs([
        { clipId: 'c1', order: 0 },
        { clipId: 'deleted', order: 1 },
      ]),
    );

    expect(ids(result.current)).toEqual(['c1']);
  });

  it('resolves undefined references to nothing, so a missing roll needs no guard', async () => {
    const { result } = await renderHook(() => useClipsByRefs(undefined));

    expect(result.current).toEqual([]);
  });
});
