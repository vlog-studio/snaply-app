import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

import type { LocalRecording } from '../recording-files';

// Thumbnails are derived cover art, not source data — they live in the cache
// directory keyed by the source file name so each clip is extracted at most
// once. Losing the cache only forces re-extraction; it never loses a clip.
const THUMBNAILS_DIRECTORY_NAME = 'recording-thumbnails';

const thumbnailsDirectory = new Directory(Paths.cache, THUMBNAILS_DIRECTORY_NAME);

function ensureThumbnailsDirectory() {
  thumbnailsDirectory.create({ idempotent: true, intermediates: true });
}

function thumbnailFileFor(recording: LocalRecording): File {
  const baseName = recording.fileName.replace(/\.[^.]+$/, '');
  return new File(thumbnailsDirectory, `${baseName}.jpg`);
}

/**
 * Returns a local URI for the recording's first-frame thumbnail, extracting and
 * caching it on first request. Resolves to `undefined` when extraction fails so
 * callers can fall back to the film-cell placeholder without breaking.
 */
export async function getRecordingThumbnail(
  recording: LocalRecording,
): Promise<string | undefined> {
  ensureThumbnailsDirectory();

  const cached = thumbnailFileFor(recording);
  if (cached.exists) return cached.uri;

  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(recording.uri, {
      time: 0,
      quality: 0.6,
    });

    const generated = new File(uri);
    if (cached.exists) cached.delete();
    await generated.move(cached);

    return cached.uri;
  } catch {
    return undefined;
  }
}

/** Removes a cached thumbnail when its source recording is deleted. */
export function deleteRecordingThumbnail(recording: LocalRecording): void {
  const cached = thumbnailFileFor(recording);
  if (cached.exists) cached.delete();
}
