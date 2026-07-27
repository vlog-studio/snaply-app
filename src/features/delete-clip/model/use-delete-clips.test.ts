import { act, renderHook } from '@testing-library/react-native';

import type { LocalRecording } from '@/shared/lib/recording-files';

import { useDeleteClips } from './use-delete-clips';

const mockDeleteLocalRecording = jest.fn();
const mockDeleteRecordingThumbnail = jest.fn();
const mockRemoveClips = jest.fn();
const mockRemoveClipsEverywhere = jest.fn();

// Mock each dependency at its slice Public API so the test stays at the seam.
jest.mock('@/shared/lib/recording-files', () => ({
  deleteLocalRecording: (uri: string) => mockDeleteLocalRecording(uri),
}));
jest.mock('@/shared/lib/recording-thumbnails', () => ({
  deleteRecordingThumbnail: (recording: unknown) => mockDeleteRecordingThumbnail(recording),
}));
jest.mock('@/entities/clip', () => ({
  useRemoveClips: () => mockRemoveClips,
}));
jest.mock('@/entities/roll', () => ({
  useRemoveClipsEverywhere: () => mockRemoveClipsEverywhere,
}));

function makeRecording(id: string): LocalRecording {
  return {
    id,
    uri: `file:///doc/recordings/${id}`,
    fileName: id,
    size: 1024,
    createdAt: 1_753_200_000_000,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDeleteLocalRecording.mockResolvedValue(undefined);
});

describe('useDeleteClips', () => {
  it('deletes the file, its thumbnail, its roll references, and its metadata', async () => {
    const recording = makeRecording('snaply-1.mp4');
    const { result } = await renderHook(() => useDeleteClips());

    await act(async () => {
      await result.current.deleteClips([recording]);
    });

    expect(mockDeleteLocalRecording).toHaveBeenCalledWith(recording.uri);
    expect(mockDeleteRecordingThumbnail).toHaveBeenCalledWith(recording);
    expect(mockRemoveClipsEverywhere).toHaveBeenCalledWith(['snaply-1.mp4']);
    expect(mockRemoveClips).toHaveBeenCalledWith(['snaply-1.mp4']);
  });

  it('returns the deleted ids', async () => {
    const targets = [makeRecording('snaply-1.mp4'), makeRecording('snaply-2.mp4')];
    const { result } = await renderHook(() => useDeleteClips());

    let deletedIds: string[] = [];
    await act(async () => {
      deletedIds = await result.current.deleteClips(targets);
    });

    expect(deletedIds).toEqual(['snaply-1.mp4', 'snaply-2.mp4']);
  });

  it('commits roll references and metadata in one write per batch', async () => {
    const targets = [makeRecording('snaply-1.mp4'), makeRecording('snaply-2.mp4')];
    const { result } = await renderHook(() => useDeleteClips());

    await act(async () => {
      await result.current.deleteClips(targets);
    });

    expect(mockRemoveClipsEverywhere).toHaveBeenCalledTimes(1);
    expect(mockRemoveClips).toHaveBeenCalledTimes(1);
    expect(mockRemoveClips).toHaveBeenCalledWith(['snaply-1.mp4', 'snaply-2.mp4']);
  });

  it('keeps the metadata of a clip whose file could not be deleted', async () => {
    const kept = makeRecording('snaply-1.mp4');
    const deleted = makeRecording('snaply-2.mp4');
    mockDeleteLocalRecording.mockImplementation((uri: string) =>
      uri === kept.uri ? Promise.reject(new Error('locked')) : Promise.resolve(undefined),
    );
    const { result } = await renderHook(() => useDeleteClips());

    let deletedIds: string[] = [];
    await act(async () => {
      deletedIds = await result.current.deleteClips([kept, deleted]);
    });

    expect(deletedIds).toEqual(['snaply-2.mp4']);
    expect(mockRemoveClips).toHaveBeenCalledWith(['snaply-2.mp4']);
    expect(mockDeleteRecordingThumbnail).not.toHaveBeenCalledWith(kept);
    expect(result.current.errorMessage).toBe('일부 컷을 삭제하지 못했어요.'); // 일부 컷을 삭제하지 못했어요.
  });

  it('touches no store when every file deletion fails', async () => {
    mockDeleteLocalRecording.mockRejectedValue(new Error('gone'));
    const { result } = await renderHook(() => useDeleteClips());

    await act(async () => {
      await result.current.deleteClips([makeRecording('snaply-1.mp4')]);
    });

    expect(mockRemoveClipsEverywhere).not.toHaveBeenCalled();
    expect(mockRemoveClips).not.toHaveBeenCalled();
    expect(result.current.errorMessage).toBe('컷을 삭제하지 못했어요.'); // 컷을 삭제하지 못했어요.
  });

  it('still commits the delete when clearing the thumbnail cache fails', async () => {
    // The file is already gone at that point, so a derived-cache failure must
    // not leave the metadata and roll references behind.
    mockDeleteRecordingThumbnail.mockImplementation(() => {
      throw new Error('cache locked');
    });
    const { result } = await renderHook(() => useDeleteClips());

    let deletedIds: string[] = [];
    await act(async () => {
      deletedIds = await result.current.deleteClips([makeRecording('snaply-1.mp4')]);
    });

    expect(deletedIds).toEqual(['snaply-1.mp4']);
    expect(mockRemoveClips).toHaveBeenCalledWith(['snaply-1.mp4']);
    expect(mockRemoveClipsEverywhere).toHaveBeenCalledWith(['snaply-1.mp4']);
    expect(result.current.errorMessage).toBeUndefined();
  });

  it('does nothing for an empty selection', async () => {
    const { result } = await renderHook(() => useDeleteClips());

    let deletedIds: string[] = ['unset'];
    await act(async () => {
      deletedIds = await result.current.deleteClips([]);
    });

    expect(deletedIds).toEqual([]);
    expect(mockDeleteLocalRecording).not.toHaveBeenCalled();
    expect(mockRemoveClipsEverywhere).not.toHaveBeenCalled();
  });

  it('clears the deleting set and the error after a successful delete', async () => {
    mockDeleteLocalRecording.mockRejectedValueOnce(new Error('locked'));
    const { result } = await renderHook(() => useDeleteClips());

    await act(async () => {
      await result.current.deleteClips([makeRecording('snaply-1.mp4')]);
    });
    expect(result.current.errorMessage).toBeDefined();

    await act(async () => {
      await result.current.deleteClips([makeRecording('snaply-2.mp4')]);
    });

    expect(result.current.errorMessage).toBeUndefined();
    expect(result.current.deletingIds.size).toBe(0);
  });

  it('clears the error on request', async () => {
    mockDeleteLocalRecording.mockRejectedValue(new Error('locked'));
    const { result } = await renderHook(() => useDeleteClips());

    await act(async () => {
      await result.current.deleteClips([makeRecording('snaply-1.mp4')]);
    });
    await act(async () => {
      result.current.clearError();
    });

    expect(result.current.errorMessage).toBeUndefined();
  });
});
