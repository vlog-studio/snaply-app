import { Image } from 'expo-image';
import { useVideoPlayer, type VideoThumbnail } from 'expo-video';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';

// Seconds into the clip to sample for the latent image. A hair past the very
// start skips the occasional black leader frame at t=0.
const SAMPLE_TIME_SEC = 0.2;

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
 * via expo-video and shown heavily blurred, dimmed, and washed in amber
 * safelight, so the frame reads as "something real is exposed here" without
 * revealing the moment before it is developed (concept §2/§4). It gives the
 * captured frame presence the flat film-black box lacked, while keeping the
 * content illegible by design.
 *
 * Business-agnostic — it takes a bare URI, not a `Clip`. It fills its parent
 * (absolute fill); the caller owns the frame's shape, border, `overflow:
 * 'hidden'`, and any edge-index overlay drawn on top.
 */
export function NegativeFrame({ uri, blurRadius = DEFAULT_BLUR, style }: NegativeFrameProps) {
  const theme = useTheme();
  const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>(null);

  // No VideoView is mounted — the player exists only to sample one still frame,
  // so it never plays and stays cheap even with several frames on screen.
  const player = useVideoPlayer(uri, (instance) => {
    instance.muted = true;
  });

  useEffect(() => {
    let cancelled = false;
    player
      .generateThumbnailsAsync(SAMPLE_TIME_SEC)
      .then((thumbnails) => {
        if (!cancelled && thumbnails[0]) setThumbnail(thumbnails[0]);
      })
      .catch(() => {
        // Leave the film-black fallback in place if sampling fails.
      });
    return () => {
      cancelled = true;
    };
  }, [player]);

  return (
    <View style={[styles.fill, { backgroundColor: theme.film }, style]}>
      {thumbnail ? (
        <Image
          accessible={false}
          source={thumbnail}
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
