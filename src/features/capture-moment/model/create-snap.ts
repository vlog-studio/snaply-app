import type { CaptureDuration } from '@/entities/capture-session';
import type { Snap } from '@/entities/snap';
import type { LocalRecording } from '@/shared/lib/recording-files';

// Portrait is the capture default; real orientation/dimension detection lands
// when a movie can target a ratio other than 9:16.
const DEFAULT_PORTRAIT_WIDTH = 1080;
const DEFAULT_PORTRAIT_HEIGHT = 1920;

export type CreateSnapInput = {
  durationSec: CaptureDuration;
};

/**
 * Builds snap metadata from a persisted recording and the capture options. The
 * snap id reuses the recording's id (its unique filename) so a snap and its
 * source video file stay tied together and re-capturing the same file is
 * idempotent in the snap store.
 */
export function createSnap(recording: LocalRecording, input: CreateSnapInput): Snap {
  return {
    id: recording.id,
    uri: recording.uri,
    durationSec: input.durationSec,
    capturedAt: recording.createdAt,
    width: DEFAULT_PORTRAIT_WIDTH,
    height: DEFAULT_PORTRAIT_HEIGHT,
    orientation: 'portrait',
  };
}
