import { useRouter, useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSnapsByRefs } from '@/entities/snap';
import { useClearTray, useRemoveSnapsFromTray, useTraySnapIds } from '@/entities/tray';
import { useComposeMovie } from '@/features/compose-movie';
import { useTemplateOffers } from '@/features/fill-template';
import { FadeInView } from '@/shared/ui/fade-in-view';
import {
  MaxContentWidth,
  Spacing,
  useTabBarHeight,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { MovieRow, useBoardMovies } from '@/widgets/movie-shelf';

import { TemplatePanel } from './template-panel';
import { TrayPanel } from './tray-panel';

/** How many movies the board previews before deferring to the movie tab. */
const BoardPreviewCount = 3;

/**
 * The studio — the workbench the app opens on.
 *
 * Three blocks, read top to bottom as material → work: the tray of picked snaps,
 * the templates that will go looking for material on their own, and the movies
 * themselves — unfinished first. Reopening the app lands here so the user
 * resumes rather than restarts (concept §3).
 *
 * The tray and the templates are two entrances to the same place and both stay:
 * one is "make a movie out of these", the other is "make me something like this".
 */
export function StudioPage() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();

  // Tapping the tab that is already open returns to the top. Switching tabs
  // keeps each tab's scroll position, which is what the shell's four tabs are
  // for — so re-tapping is the reset, as it is on a native tab bar.
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const traySnapIds = useTraySnapIds();
  const removeSnapsFromTray = useRemoveSnapsFromTray();
  const clearTray = useClearTray();
  const { startMovieFromTray } = useComposeMovie();
  const templateOffers = useTemplateOffers();
  const boardMovies = useBoardMovies();

  // The tray stores ids; resolving them to snaps is the same join every movie
  // surface uses, with the pick order standing in for the cut order.
  const traySnaps = useSnapsByRefs(traySnapIds.map((snapId, order) => ({ snapId, order })));

  const pickSnaps = () => router.push({ pathname: '/snaps', params: { select: '1' } });
  // Every movie opens on the same screen, whatever it is waiting for: watching a
  // finished one and fixing it happen in the same place.
  const openMovie = (movieId: string) =>
    router.push({ pathname: '/movie/[id]', params: { id: movieId } });

  const openTemplate = (templateId: string) =>
    router.push({ pathname: '/template/[id]', params: { id: templateId } });

  const startMovie = () => {
    const movie = startMovieFromTray();
    if (movie) openMovie(movie.id);
  };

  return (
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
        <ThemedText type="title">스튜디오</ThemedText>
      </View>

      <FadeInView duration={260} style={styles.blocks}>
        <TrayPanel
          snaps={traySnaps}
          onPickMore={pickSnaps}
          onRemove={(snapId) => removeSnapsFromTray([snapId])}
          onClear={clearTray}
          onStartMovie={startMovie}
        />

        <TemplatePanel offers={templateOffers} onOpen={openTemplate} />

        {/* No movies yet means no board: a heading over a dashed sentence that
            says the list is empty adds a block without adding a fact. The two
            entrances above are what an empty studio has to offer. */}
        {boardMovies.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <ThemedText type="smallBold">무비</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="무비 전체 보기"
                hitSlop={8}
                onPress={() => router.navigate('/movies')}
              >
                <ThemedText selectable={false} type="note" themeColor="primary">
                  전체 보기
                </ThemedText>
              </Pressable>
            </View>
            {boardMovies.slice(0, BoardPreviewCount).map((movie) => (
              <MovieRow key={movie.id} movie={movie} onPress={openMovie} />
            ))}
          </View>
        ) : null}
      </FadeInView>
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
  blocks: { gap: Spacing.five },
  section: { gap: Spacing.two },
  sectionHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
