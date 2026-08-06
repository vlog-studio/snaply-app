import { useRouter, useScrollToTop } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  MaxContentWidth,
  Radius,
  Spacing,
  useTabBarHeight,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { MovieTile, useMovieSummaries, type MovieSummary } from '@/widgets/movie-shelf';

import { MovieActionsSheet } from './movie-actions-sheet';

/** Two columns, as in the mockup: a square cover wants the width. */
const Columns = 2;

/**
 * The movie tab — every movie, drafts included, most recent work first.
 *
 * Drafts sit in the same grid as finished movies rather than in a separate
 * section: they are the same object at a different point in its life, and the
 * status badge is what distinguishes them.
 */
export function MoviesPage() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const { width: windowWidth } = useWindowDimensions();
  const movies = useMovieSummaries();

  // The movie a long press picked out. It outlives the sheet's `visible` flag
  // so the sheet keeps its words through the close animation.
  const [selected, setSelected] = useState<MovieSummary>();
  const [actionsVisible, setActionsVisible] = useState(false);

  const openActions = (movie: MovieSummary) => {
    setSelected(movie);
    setActionsVisible(true);
  };

  // Re-tapping the 무비 tab returns to the newest movies; switching tabs keeps
  // the grid where the user left it.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Derived instead of measured (the content column is centered, capped at
  // MaxContentWidth, and padded) so the tiles lay out on their first frame.
  const gridWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.five * 2;
  const tileWidth = Math.floor((gridWidth - Spacing.three * (Columns - 1)) / Columns);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.six + topInset, paddingBottom: Spacing.seven + tabBarHeight },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="title">무비</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {movies.length}편
          </ThemedText>
        </View>

        {movies.length > 0 ? (
          <View style={styles.grid}>
            {movies.map((movie) => (
              <MovieTile
                key={movie.id}
                movie={movie}
                width={tileWidth}
                // One destination for every status: the movie screen is where a
                // finished movie is watched and where an unfinished one is run.
                onPress={(movieId) =>
                  router.push({ pathname: '/movie/[id]', params: { id: movieId } })
                }
                // The actions live here rather than on the movie screen: the
                // grid is where all the movies stand side by side, which is
                // where one is noticed as misnamed, worth sending, or
                // redundant. Same gesture as the snap grid — a long press is
                // how this app acts on a thing instead of opening it.
                onLongPress={openActions}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <ThemedText type="heading">아직 만든 무비가 없어요</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              스냅 탭에서 쓸 장면을 골라 트레이에 담아두면, 스튜디오에서 한 편으로 엮을 수 있어요.
            </ThemedText>
          </View>
        )}
      </ScrollView>

      <MovieActionsSheet
        visible={actionsVisible}
        movie={selected}
        onClose={() => setActionsVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
  },
  header: { gap: Spacing.half },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
  },
  centerText: { textAlign: 'center' },
});
