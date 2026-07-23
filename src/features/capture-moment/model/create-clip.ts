import type { CaptureDuration, CaptureMood } from '@/entities/capture-session';
import type { Clip } from '@/entities/clip';
import type { LocalRecording } from '@/shared/lib/recording-files';

// Portrait is the daily-roll default; real orientation/dimension detection is
// deferred (mvp-implementation-plan.md §5: "저장만, 방향 메타 최소").
const DEFAULT_PORTRAIT_WIDTH = 1080;
const DEFAULT_PORTRAIT_HEIGHT = 1920;

export type CreateClipInput = {
  durationSec: CaptureDuration;
  mood?: CaptureMood;
};

/**
 * Builds clip metadata from a persisted recording and the capture options. The
 * clip id reuses the recording's id (its unique filename) so a clip and its
 * source video file stay tied together and re-capturing the same file is
 * idempotent in the clip store.
 */
export function createClip(recording: LocalRecording, input: CreateClipInput): Clip {
  return {
    id: recording.id,
    uri: recording.uri,
    durationSec: input.durationSec,
    mood: input.mood,
    capturedAt: recording.createdAt,
    width: DEFAULT_PORTRAIT_WIDTH,
    height: DEFAULT_PORTRAIT_HEIGHT,
    orientation: 'portrait',
    tags: [],
  };
}
