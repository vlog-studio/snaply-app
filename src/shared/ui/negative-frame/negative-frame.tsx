import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { getVideoThumbnail } from '@/shared/lib/video-thumbnails';

import { useTheme } from '../theme';

// The negative is a latent image — exposed but not yet developed, so it must
// stay unreadable. A heavy blur (in points) abstracts the frame down to color
// and light only; the moment itself is revealed only on develop.
const DEFAULT_BLUR = 8;

export type NegativeFrameProps = {
  /** Source clip video URI; its first frame becomes the frosted negative. */
  uri: string;
  /** Blur strength in points. Higher keeps the frame less readable. */
  blurRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A clip rendered as a frosted, undeveloped negative: its first frame is sampled
 * and shown heavily blurred, dimmed, and washed in amber safelight, so the frame
 * reads as "something real is exposed here" without revealing the moment before
 * it is developed (concept §2/§4). It gives the captured frame presence the flat
 * film-black box lacked, while keeping the content illegible by design.
 *
 * The frame is extracted through the shared, disk-cached `video-thumbnails` util
 * (a one-shot native call), not a live video player. That is what lets a whole
 * contact sheet of negatives render at once: mounting one `useVideoPlayer` per
 * frame exhausts the platform's small pool of hardware decoders, so every frame
 * but the last silently stays black.
 *
 * Business-agnostic — it takes a bare URI, not a `Clip`. It fills its parent
 * (absolute fill); the caller owns the frame's shape, border, `overflow:
 * 'hidden'`, and any edge-index overlay drawn on top.
 */
export function NegativeFrame({ uri, blurRadius = DEFAULT_BLUR, style }: NegativeFrameProps) {
  const theme = useTheme();
  const [thumbnailUri, setThumbnailUri] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void getVideoThumbnail(uri).then((resolved) => {
      if (!cancelled) setThumbnailUri(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return (
    <View style={[styles.fill, { backgroundColor: theme.film }, style]}>
      {thumbnailUri ? (
        <Image
          accessible={false}
          source={{ uri: thumbnailUri }}
          contentFit="cover"
          blurRadius={blurRadius}
          style={StyleSheet.absoluteFill}
          // A gentle fade so the negative "surfaces" rather than pops in.
          transition={280}
        />
      ) : null}
      {/* Dark scrim keeps the blurred frame dim and unreadable; the amber wash
          on top ties it to the safelight so it still reads as film. */}
      <View style={[StyleSheet.absoluteFill, styles.scrim, { backgroundColor: theme.film }]} />
      <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: theme.amber }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  scrim: { opacity: 0.4 },
  tint: { opacity: 0.16 },
});
