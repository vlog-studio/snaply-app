import type { LocalRecording } from '../recording-files';

// Recordings never persist on web (the file adapter lists none), so there is
// nothing to derive a thumbnail from.
export async function getRecordingThumbnail(
  _recording: LocalRecording,
): Promise<string | undefined> {
  return undefined;
}

export function deleteRecordingThumbnail(_recording: LocalRecording): void {}
