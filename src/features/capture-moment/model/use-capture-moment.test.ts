import { act, renderHook } from '@testing-library/react-native';

import { useCaptureMoment } from './use-capture-moment';

const mockAddSnap = jest.fn();
const mockPersist = jest.fn();
const mockReadPlace = jest.fn();

// Mock each dependency at its slice Public API so the test stays at the seam.
jest.mock('@/entities/snap', () => ({
  useAddSnap: () => mockAddSnap,
}));
jest.mock('@/shared/lib/recording-files', () => ({
  persistLocalRecording: (uri: string) => mockPersist(uri),
}));
// Same-slice sibling: mocked at its own path, and covered by its own test.
jest.mock('../lib/read-capture-place', () => ({
  readCapturePlace: () => mockReadPlace(),
}));

const recording = {
  id: 'snaply-1.mp4',
  uri: 'file:///doc/recordings/snaply-1.mp4',
  fileName: 'snaply-1.mp4',
  size: 4096,
  createdAt: 1_753_200_000_000,
};

describe('useCaptureMoment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersist.mockResolvedValue(recording);
    mockReadPlace.mockResolvedValue(undefined);
  });

  it('persists the file and creates a snap, filing it into nothing', async () => {
    const { result } = await renderHook(() => useCaptureMoment());

    let snap: Awaited<ReturnType<typeof result.current.captureMoment>> = null;
    await act(async () => {
      snap = await result.current.captureMoment('file:///cache/snap.mov', { durationSec: 3 });
    });

    expect(mockPersist).toHaveBeenCalledWith('file:///cache/snap.mov');
    expect(mockAddSnap).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snaply-1.mp4', durationSec: 3 }),
    );
    expect(snap).toMatchObject({ id: 'snaply-1.mp4' });
    expect(result.current.error).toBeNull();
  });

  it('tags the snap with where it was captured when a fix is available', async () => {
    mockReadPlace.mockResolvedValue({ latitude: 37.5445, longitude: 127.0557 });
    const { result } = await renderHook(() => useCaptureMoment());

    await act(async () => {
      await result.current.captureMoment('file:///cache/snap.mov', { durationSec: 3 });
    });

    expect(mockAddSnap).toHaveBeenCalledWith(
      expect.objectContaining({ place: { latitude: 37.5445, longitude: 127.0557 } }),
    );
  });

  it('files the snap with no place at all when there is no fix', async () => {
    const { result } = await renderHook(() => useCaptureMoment());

    await act(async () => {
      await result.current.captureMoment('file:///cache/snap.mov', { durationSec: 3 });
    });

    expect(mockAddSnap).toHaveBeenCalledTimes(1);
    expect(mockAddSnap.mock.calls[0][0]).not.toHaveProperty('place');
  });

  it('surfaces an error and skips the store write when persistence fails', async () => {
    mockPersist.mockRejectedValue(new Error('disk full'));
    const { result } = await renderHook(() => useCaptureMoment());

    let snap: Awaited<ReturnType<typeof result.current.captureMoment>> = { id: 'x' } as never;
    await act(async () => {
      snap = await result.current.captureMoment('file:///cache/snap.mov', { durationSec: 3 });
    });

    expect(snap).toBeNull();
    expect(mockAddSnap).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });
});
