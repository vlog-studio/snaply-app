import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

// Thumbnails are derived cover art, not source data — they live in the cache
// directory keyed by the source file's base name so each clip is extracted at
// most once and shared across every surface that previews it (the cut grid,
// Home's contact-sheet strip, negative frames). Losing the cache only forces
// re-extraction; it never loses a clip.
const THUMBNAILS_DIRECTORY_NAME = 'video-thumbnails';

// A hair past t=0 skips the occasional black leader frame some clips open on.
const SAMPLE_TIME_MS = 200;

const thumbnailsDirectory = new Directory(Paths.cache, THUMBNAILS_DIRECTORY_NAME);

function ensureThumbnailsDirectory() {
  thumbnailsDirectory.create({ idempotent: true, intermediates: true });
}

// The cache key is the source file's base name, so the same underlying file
// resolves to one thumbnail whether the caller holds a LocalRecording or a bare
// clip URI.
function cacheKeyForUri(uri: string): string {
  const lastSegment = uri.split('/').pop() ?? uri;
  const withoutQuery = lastSegment.split('?')[0];
  return withoutQuery.replace(/\.[^.]+$/, '');
}

function thumbnailFileForUri(uri: string): File {
  return new File(thumbnailsDirectory, `${cacheKeyForUri(uri)}.jpg`);
}

/**
 * Returns a local URI for the video's first-frame thumbnail, extracting and
 * caching it on first request. Resolves to `undefined` when extraction fails so
 * callers can fall back to a placeholder without breaking.
 *
 * Extraction is a one-shot native call (expo-video-thumbnails) that does not
 * keep a live video player around. Rendering many frames at once therefore never
 * exhausts the platform's limited pool of hardware video decoders — unlike
 * mounting one player per frame, which silently drops the earlier frames.
 */
export async function getVideoThumbnail(uri: string): Promise<string | undefined> {
  ensureThumbnailsDirectory();

  const cached = thumbnailFileForUri(uri);
  if (cached.exists) return cached.uri;

  try {
    const { uri: generatedUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: SAMPLE_TIME_MS,
      quality: 0.6,
    });

    const generated = new File(generatedUri);
    if (cached.exists) cached.delete();
    await generated.move(cached);

    return cached.uri;
  } catch {
    return undefined;
  }
}

/** Removes a cached thumbnail when its source video is deleted. */
export function deleteVideoThumbnail(uri: string): void {
  const cached = thumbnailFileForUri(uri);
  if (cached.exists) cached.delete();
}
