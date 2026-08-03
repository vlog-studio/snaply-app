import { Pressable, StyleSheet, View } from 'react-native';

import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

import type { MovieSummary } from '../model/use-movie-shelf';
import { MovieStatusBadge, MovieStatusLabels } from './movie-status-badge';

export type MovieTileProps = {
  movie: MovieSummary;
  /** Tile width in points; the 9:16 cover height is derived from it. */
  width: number;
  onPress: (movieId: string) => void;
};

/**
 * One movie in the movie tab's grid: a 9:16 cover of its first cut with the
 * length and status over it, and the title beneath.
 */
export function MovieTile({ movie, width, onPress }: MovieTileProps) {
  const theme = useTheme();
  const cover = movie.coverUris[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${movie.title} · ${MovieStatusLabels[movie.status]} · ${formatSeconds(movie.totalSec)}`}
      onPress={() => onPress(movie.id)}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }, styles.tile]}
    >
      <View
        style={[styles.cover, { height: Math.round((width * 16) / 9), borderColor: theme.border }]}
      >
        {cover ? <VideoFrame uri={cover} /> : null}
        <View style={styles.badge}>
          <MovieStatusBadge status={movie.status} />
        </View>
        <View style={styles.duration}>
          <ThemedText selectable={false} type="edge" style={styles.durationText}>
            {formatSeconds(movie.totalSec)}
          </ThemedText>
        </View>
        {movie.progress !== undefined ? (
          <View style={[styles.track, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: theme.ai, width: `${Math.round(movie.progress * 100)}%` },
              ]}
            />
          </View>
        ) : null}
      </View>
      <ThemedText type="smallBold" numberOfLines={1}>
        {movie.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {movie.dateLabel} · 스냅 {movie.snapCount}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { gap: Spacing.one },
  cover: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  badge: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  duration: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.two,
    borderRadius: Radius.small,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  // Drawn over arbitrary video, so plain white rather than a palette color.
  durationText: { color: '#FFFFFF' },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3 },
  fill: { height: '100%' },
});
