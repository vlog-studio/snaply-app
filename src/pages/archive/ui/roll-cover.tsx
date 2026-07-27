import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useVideoThumbnail } from '@/shared/lib/video-thumbnails';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { formatReelLength, type RollSummary } from '@/widgets/roll-shelf';

/** A cover always draws four tiles, repeating the roll's frames if it has fewer. */
const MosaicTiles = 4;

type RollCoverProps = {
  roll: RollSummary;
  onPress: () => void;
};

function MosaicTile({ uri }: { uri: string | undefined }) {
  const theme = useTheme();
  const thumbnailUri = useVideoThumbnail(uri);

  return (
    <View style={[styles.tile, { backgroundColor: theme.film }]}>
      {thumbnailUri ? (
        <Image
          accessible={false}
          contentFit="cover"
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          transition={200}
        />
      ) : null}
    </View>
  );
}

/**
 * A developed roll on the shelf: its own frames as cover art.
 *
 * The cover is a four-up mosaic of the reel's first frames rather than a flat
 * tint, so a roll looks like what is inside it. The frames come from the same
 * disk cache the cut grid uses, so drawing a shelf costs no new extraction. A
 * roll with fewer than four cuts repeats the frames it has, keeping every cover
 * the same shape.
 *
 * The roll's tint survives as a spine down the left edge — enough to identify
 * the roll across surfaces without painting over its own frames.
 */
function RollCoverComponent({ roll, onPress }: RollCoverProps) {
  const theme = useTheme();
  const tiles = Array.from({ length: MosaicTiles }, (_, index) =>
    roll.coverUris.length > 0 ? roll.coverUris[index % roll.coverUris.length] : undefined,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${roll.title} 릴 재생`}
      accessibilityHint={`${roll.clipCount}컷 · ${formatReelLength(roll.totalSec)}`}
      onPress={onPress}
      style={[styles.cover, { backgroundColor: theme.film }]}
    >
      <View style={styles.mosaic}>
        {tiles.map((uri, index) => (
          <MosaicTile key={`${uri ?? 'empty'}-${index}`} uri={uri} />
        ))}
      </View>
      {/* Keeps the edge print and title legible over any frame. */}
      <View style={styles.scrim} />
      <View style={[styles.spine, { backgroundColor: roll.tint }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <ThemedText selectable={false} style={styles.coverEdge}>
            {roll.dayKey ?? '롤'} · {roll.clipCount}컷
          </ThemedText>
          <View style={styles.lengthBadge}>
            <ThemedText selectable={false} style={[styles.lengthText, { color: theme.lumen }]}>
              {formatReelLength(roll.totalSec)}
            </ThemedText>
          </View>
        </View>
        <ThemedText selectable={false} style={styles.coverTitle} numberOfLines={1}>
          {roll.title}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export const RollCover = memo(RollCoverComponent);

const styles = StyleSheet.create({
  cover: {
    width: '48%',
    height: 132,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  mosaic: { ...StyleSheet.absoluteFill, flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: '50%', height: '50%' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,7,5,0.5)' },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  body: { flex: 1, padding: Spacing.four, justifyContent: 'space-between' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  coverEdge: {
    flex: 1,
    fontSize: 9,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  lengthBadge: {
    backgroundColor: 'rgba(14,11,8,0.55)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  lengthText: { fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  coverTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
});
