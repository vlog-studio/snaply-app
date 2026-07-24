import { deleteVideoThumbnail, getVideoThumbnail } from '../video-thumbnails';

import type { LocalRecording } from '../recording-files';

// Recording thumbnails are just video thumbnails keyed by the recording's file.
// The extraction, caching, and platform split all live in `video-thumbnails`;
// this module only adapts the LocalRecording shape onto that generic util so the
// cache is shared with every other surface that previews the same file.

/**
 * Returns a local URI for the recording's first-frame thumbnail, extracting and
 * caching it on first request. Resolves to `undefined` when extraction fails so
 * callers can fall back to the film-cell placeholder without breaking.
 */
export async function getRecordingThumbnail(
  recording: LocalRecording,
): Promise<string | undefined> {
  return getVideoThumbnail(recording.uri);
}

/** Removes a cached thumbnail when its source recording is deleted. */
export function deleteRecordingThumbnail(recording: LocalRecording): void {
  deleteVideoThumbnail(recording.uri);
}
