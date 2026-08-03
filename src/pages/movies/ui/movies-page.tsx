import { ScrollView, StyleSheet, View } from 'react-native';

import {
  MaxContentWidth,
  Radius,
  Spacing,
  useTabBarHeight,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { useMovieSummaries } from '@/widgets/movie-shelf';

/**
 * The movie tab — every finished vlog and every draft, newest work first.
 *
 * Nothing can create a movie until the editor lands in the next stage of the
 * rebuild, so the grid is empty by construction and the screen shows what to do
 * about it. The count comes from the real shelf, not a placeholder, so the page
 * fills itself the moment movies exist.
 */
export function MoviesPage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const movies = useMovieSummaries();

  return (
    <ScrollView
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

      <View style={[styles.empty, { borderColor: theme.border }]}>
        <ThemedText type="heading">아직 만든 무비가 없어요</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          스냅 탭에서 쓸 장면을 골라 트레이에 담아두면, 스튜디오에서 한 편으로 엮을 수 있어요.
        </ThemedText>
      </View>
    </ScrollView>
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
