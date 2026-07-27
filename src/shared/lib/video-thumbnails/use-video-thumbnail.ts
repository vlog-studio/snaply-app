import { useEffect, useState } from 'react';

import { getVideoThumbnail } from './video-thumbnails';

/**
 * Lazily resolves a video's cached first frame. Returns `undefined` while the
 * frame is being extracted and when extraction fails, so a caller can hold its
 * placeholder in both cases.
 *
 * The resolved frame is stored together with the URI it belongs to and reported
 * only while that URI is still the one being asked about. A caller that swaps
 * sources therefore falls back to its placeholder immediately instead of
 * flashing the previous video's frame.
 */
export function useVideoThumbnail(uri: string | undefined): string | undefined {
  const [resolved, setResolved] = useState<{ uri: string; thumbnailUri?: string }>();

  useEffect(() => {
    if (!uri) return;
    let isActive = true;
    void getVideoThumbnail(uri).then((thumbnailUri) => {
      if (isActive) setResolved({ uri, thumbnailUri });
    });
    return () => {
      isActive = false;
    };
  }, [uri]);

  return resolved && resolved.uri === uri ? resolved.thumbnailUri : undefined;
}
