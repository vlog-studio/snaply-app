import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  deleteLocalRecording,
  listLocalRecordings,
  persistLocalRecording,
  type LocalRecording,
} from '@/shared/lib/recording-files';

import { useLocalRecordings } from './use-local-recordings';

jest.mock('@/shared/lib/recording-files', () => ({
  listLocalRecordings: jest.fn(),
  persistLocalRecording: jest.fn(),
  deleteLocalRecording: jest.fn(),
}));

jest.mock('@/shared/lib/recording-thumbnails', () => ({
  deleteRecordingThumbnail: jest.fn(),
}));

const listLocalRecordingsMock = jest.mocked(listLocalRecordings);
const persistLocalRecordingMock = jest.mocked(persistLocalRecording);
const deleteLocalRecordingMock = jest.mocked(deleteLocalRecording);

function createRecording(overrides: Partial<LocalRecording> = {}): LocalRecording {
  return {
    id: 'snaply-1.mp4',
    uri: 'file:///recordings/snaply-1.mp4',
    fileName: 'snaply-1.mp4',
    size: 1024,
    createdAt: 1,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  listLocalRecordingsMock.mockResolvedValue([]);
});

describe('useLocalRecordings', () => {
  it('loads the stored recordings on mount and clears the loading flag', async () => {
    const stored = [createRecording()];
    listLocalRecordingsMock.mockResolvedValue(stored);

    const { result } = await renderHook(() => useLocalRecordings());

    // `await renderHook` flushes the mount effect, so the load has settled.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.recordings).toEqual(stored);
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('exposes a Korean error message when the initial load fails', async () => {
    listLocalRecordingsMock.mockRejectedValue(new Error('read failed'));

    const { result } = await renderHook(() => useLocalRecordings());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.errorMessage).toBe('저장된 영상 목록을 불러오지 못했어요.');
    expect(result.current.recordings).toEqual([]);
  });

  it('prepends a saved recording and returns it', async () => {
    const existing = createRecording({ id: 'snaply-1.mp4' });
    const saved = createRecording({ id: 'snaply-2.mp4', createdAt: 2 });
    listLocalRecordingsMock.mockResolvedValue([existing]);
    persistLocalRecordingMock.mockResolvedValue(saved);

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returned: LocalRecording | undefined;
    await act(async () => {
      returned = await result.current.saveRecording('file:///tmp/clip.mov');
    });

    expect(persistLocalRecordingMock).toHaveBeenCalledWith('file:///tmp/clip.mov');
    expect(returned).toEqual(saved);
    expect(result.current.recordings).toEqual([saved, existing]);
  });

  it('reports a save failure and leaves the list unchanged', async () => {
    const existing = createRecording();
    listLocalRecordingsMock.mockResolvedValue([existing]);
    persistLocalRecordingMock.mockRejectedValue(new Error('disk full'));

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returned: LocalRecording | undefined;
    await act(async () => {
      returned = await result.current.saveRecording('file:///tmp/clip.mov');
    });

    expect(returned).toBeUndefined();
    expect(result.current.errorMessage).toBe(
      '촬영한 영상을 저장하지 못했어요. 다시 시도해 주세요.',
    );
    expect(result.current.recordings).toEqual([existing]);
  });

  it('removes a recording optimistically and reports success', async () => {
    const kept = createRecording({ id: 'snaply-1.mp4' });
    const removed = createRecording({ id: 'snaply-2.mp4' });
    listLocalRecordingsMock.mockResolvedValue([kept, removed]);
    deleteLocalRecordingMock.mockResolvedValue();

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.removeRecording(removed);
    });

    expect(deleteLocalRecordingMock).toHaveBeenCalledWith(removed.uri);
    expect(succeeded).toBe(true);
    expect(result.current.recordings).toEqual([kept]);
    expect(result.current.deletingId).toBeUndefined();
  });

  it('reports a delete failure and keeps the recording in the list', async () => {
    const target = createRecording();
    listLocalRecordingsMock.mockResolvedValue([target]);
    deleteLocalRecordingMock.mockRejectedValue(new Error('locked'));

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.removeRecording(target);
    });

    expect(succeeded).toBe(false);
    expect(result.current.errorMessage).toBe('영상을 삭제하지 못했어요.');
    expect(result.current.recordings).toEqual([target]);
    expect(result.current.deletingId).toBeUndefined();
  });

  it('removes several recordings in one batch and reports success', async () => {
    const kept = createRecording({ id: 'snaply-1.mp4' });
    const first = createRecording({ id: 'snaply-2.mp4', uri: 'file:///r/2.mp4' });
    const second = createRecording({ id: 'snaply-3.mp4', uri: 'file:///r/3.mp4' });
    listLocalRecordingsMock.mockResolvedValue([kept, first, second]);
    deleteLocalRecordingMock.mockResolvedValue();

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.removeRecordings([first, second]);
    });

    expect(deleteLocalRecordingMock).toHaveBeenCalledTimes(2);
    expect(succeeded).toBe(true);
    expect(result.current.recordings).toEqual([kept]);
    expect(result.current.deletingIds.size).toBe(0);
  });

  it('keeps the clips that succeeded when part of a batch fails', async () => {
    const good = createRecording({ id: 'snaply-1.mp4', uri: 'file:///r/1.mp4' });
    const bad = createRecording({ id: 'snaply-2.mp4', uri: 'file:///r/2.mp4' });
    listLocalRecordingsMock.mockResolvedValue([good, bad]);
    deleteLocalRecordingMock.mockImplementation(async (uri: string) => {
      if (uri === bad.uri) throw new Error('locked');
    });

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.removeRecordings([good, bad]);
    });

    expect(succeeded).toBe(false);
    expect(result.current.errorMessage).toBe('일부 컷을 삭제하지 못했어요.');
    expect(result.current.recordings).toEqual([bad]);
    expect(result.current.deletingIds.size).toBe(0);
  });

  it('does nothing when asked to remove an empty batch', async () => {
    const only = createRecording();
    listLocalRecordingsMock.mockResolvedValue([only]);

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let succeeded: boolean | undefined;
    await act(async () => {
      succeeded = await result.current.removeRecordings([]);
    });

    expect(succeeded).toBe(true);
    expect(deleteLocalRecordingMock).not.toHaveBeenCalled();
    expect(result.current.recordings).toEqual([only]);
  });

  it('clears an existing error message on demand', async () => {
    listLocalRecordingsMock.mockRejectedValue(new Error('read failed'));

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.errorMessage).toBeDefined());

    await act(async () => result.current.clearError());

    expect(result.current.errorMessage).toBeUndefined();
  });

  it('refreshes the list when reloadRecordings is called', async () => {
    const initial = [createRecording({ id: 'snaply-1.mp4' })];
    const refreshed = [
      createRecording({ id: 'snaply-1.mp4' }),
      createRecording({ id: 'snaply-2.mp4' }),
    ];
    listLocalRecordingsMock.mockResolvedValueOnce(initial).mockResolvedValueOnce(refreshed);

    const { result } = await renderHook(() => useLocalRecordings());
    await waitFor(() => expect(result.current.recordings).toEqual(initial));

    await act(async () => {
      await result.current.reloadRecordings();
    });

    expect(result.current.recordings).toEqual(refreshed);
  });
});
