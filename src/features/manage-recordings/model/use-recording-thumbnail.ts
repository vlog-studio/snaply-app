import { useEffect, useState } from 'react';

import type { LocalRecording } from '@/shared/lib/recording-files';
import { getRecordingThumbnail } from '@/shared/lib/recording-thumbnails';

/**
 * Lazily resolves a recording's first-frame thumbnail. Returns `undefined`
 * while loading or when extraction fails, letting the cell show its film-cell
 * placeholder in the meantime.
 */
export function useRecordingThumbnail(recording: LocalRecording) {
  const [thumbnailUri, setThumbnailUri] = useState<string>();

  useEffect(() => {
    let isActive = true;

    void getRecordingThumbnail(recording).then((uri) => {
      if (isActive) setThumbnailUri(uri);
    });

    return () => {
      isActive = false;
    };
    // Re-resolve only when the underlying file changes, not on every new
    // LocalRecording object identity produced by a list reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording.uri]);

  return thumbnailUri;
}
