import { act, renderHook } from '@testing-library/react-native';

import { useCaptureMoment } from './use-capture-moment';

const mockAddClip = jest.fn();
const mockAddClipToRoll = jest.fn();
const mockEnsureDailyRoll = jest.fn();
const mockPersist = jest.fn();

// Mock each dependency at its slice Public API so the test stays at the seam.
jest.mock('@/entities/clip', () => ({
  useAddClip: () => mockAddClip,
}));
jest.mock('@/entities/roll', () => ({
  useAddClipToRoll: () => mockAddClipToRoll,
  ensureDailyRoll: () => mockEnsureDailyRoll(),
}));
jest.mock('@/shared/lib/recording-files', () => ({
  persistLocalRecording: (uri: string) => mockPersist(uri),
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
    mockEnsureDailyRoll.mockReturnValue({ id: 'daily-2026-07-23' });
  });

  it('persists the file, creates a clip, and adds it to today’s roll', async () => {
    const { result } = await renderHook(() => useCaptureMoment());

    let clip: Awaited<ReturnType<typeof result.current.captureMoment>> = null;
    await act(async () => {
      clip = await result.current.captureMoment('file:///cache/clip.mov', {
        durationSec: 3,
        mood: 'hip',
      });
    });

    expect(mockPersist).toHaveBeenCalledWith('file:///cache/clip.mov');
    expect(mockAddClip).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snaply-1.mp4', durationSec: 3, mood: 'hip' }),
    );
    expect(mockAddClipToRoll).toHaveBeenCalledWith('daily-2026-07-23', 'snaply-1.mp4');
    expect(clip).toMatchObject({ id: 'snaply-1.mp4' });
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error and skips the store writes when persistence fails', async () => {
    mockPersist.mockRejectedValue(new Error('disk full'));
    const { result } = await renderHook(() => useCaptureMoment());

    let clip: Awaited<ReturnType<typeof result.current.captureMoment>> = { id: 'x' } as never;
    await act(async () => {
      clip = await result.current.captureMoment('file:///cache/clip.mov', { durationSec: 3 });
    });

    expect(clip).toBeNull();
    expect(mockAddClip).not.toHaveBeenCalled();
    expect(mockAddClipToRoll).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });
});
