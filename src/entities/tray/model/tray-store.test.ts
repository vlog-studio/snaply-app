import { act, renderHook } from '@testing-library/react-native';

import {
  TrayCapacity,
  useAddSnapsToTray,
  useClearTray,
  useRemoveSnapsFromTray,
  useTraySnapIds,
  useTrayStore,
} from './tray-store';

// Mock the persistence backend so no native file system is touched.
jest.mock('@/shared/lib/local-store', () => ({
  localStore: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

function snapIds(count: number, prefix = 's'): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}

describe('tray store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The store is a module-level singleton; reset it so tests stay independent.
    useTrayStore.setState({ snapIds: [] });
  });

  it('keeps the order snaps were picked in', async () => {
    const { result } = await renderHook(() => ({
      tray: useTraySnapIds(),
      add: useAddSnapsToTray(),
    }));

    await act(async () => {
      result.current.add(['s3', 's1']);
    });
    await act(async () => {
      result.current.add(['s2']);
    });

    expect(result.current.tray).toEqual(['s3', 's1', 's2']);
  });

  it('reports what it actually added', async () => {
    const { result } = await renderHook(() => useAddSnapsToTray());

    let outcome;
    await act(async () => {
      outcome = result.current(['s1', 's2']);
    });

    expect(outcome).toEqual({ added: 2, rejected: 0 });
  });

  it('counts a snap already in the tray as neither added nor rejected', async () => {
    useTrayStore.setState({ snapIds: ['s1'] });
    const { result } = await renderHook(() => useAddSnapsToTray());

    let outcome;
    await act(async () => {
      outcome = result.current(['s1', 's2']);
    });

    expect(outcome).toEqual({ added: 1, rejected: 0 });
    expect(useTrayStore.getState().snapIds).toEqual(['s1', 's2']);
  });

  it('fills the tray to capacity and rejects the rest', async () => {
    useTrayStore.setState({ snapIds: snapIds(TrayCapacity - 2, 'held') });
    const { result } = await renderHook(() => useAddSnapsToTray());

    let outcome;
    await act(async () => {
      outcome = result.current(snapIds(5, 'new'));
    });

    expect(outcome).toEqual({ added: 2, rejected: 3 });
    expect(useTrayStore.getState().snapIds).toHaveLength(TrayCapacity);
  });

  it('refuses everything once the tray is full', async () => {
    const full = snapIds(TrayCapacity);
    useTrayStore.setState({ snapIds: full });
    const { result } = await renderHook(() => useAddSnapsToTray());

    let outcome;
    await act(async () => {
      outcome = result.current(['extra']);
    });

    expect(outcome).toEqual({ added: 0, rejected: 1 });
    expect(useTrayStore.getState().snapIds).toEqual(full);
  });

  it('takes snaps back out', async () => {
    useTrayStore.setState({ snapIds: ['s1', 's2', 's3'] });
    const { result } = await renderHook(() => useRemoveSnapsFromTray());

    await act(async () => result.current(['s2']));

    expect(useTrayStore.getState().snapIds).toEqual(['s1', 's3']);
  });

  it('empties the tray', async () => {
    useTrayStore.setState({ snapIds: ['s1', 's2'] });
    const { result } = await renderHook(() => useClearTray());

    await act(async () => result.current());

    expect(useTrayStore.getState().snapIds).toEqual([]);
  });

  it.each([[[]], [['not-in-tray']]])(
    'keeps the same array for a no-op remove of %j',
    async (ids) => {
      const held = ['s1'];
      useTrayStore.setState({ snapIds: held });
      const { result } = await renderHook(() => useRemoveSnapsFromTray());

      await act(async () => result.current(ids));

      expect(useTrayStore.getState().snapIds).toBe(held);
    },
  );
});
