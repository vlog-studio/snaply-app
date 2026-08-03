import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useSnapsByRefs } from '@/entities/snap';
import { useClearTray, useRemoveSnapsFromTray, useTraySnapIds } from '@/entities/tray';
import { useComposeMovie } from '@/features/compose-movie';
import { useTemplateOffers } from '@/features/fill-template';
import { FadeInView } from '@/shared/ui/fade-in-view';
import {
  MaxContentWidth,
  Radius,
  Spacing,
  useTabBarHeight,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { MovieRow, useInProgressMovies, useReadyMovies } from '@/widgets/movie-shelf';

import { TemplatePanel } from './template-panel';
import { TrayPanel } from './tray-panel';

/** How many finished movies the studio previews before deferring to the tab. */
const RecentReadyCount = 2;

/**
 * The studio — the workbench the app opens on.
 *
 * Four blocks, read top to bottom as material → work → results: the tray of
 * picked snaps, the templates that will go looking for material on their own,
 * the movies still being worked on, and the most recent finished ones. Reopening
 * the app lands here so the user resumes rather than restarts (concept §3).
 *
 * The tray and the templates are two entrances to the same place and both stay:
 * one is "make a movie out of these", the other is "make me something like this".
 */
export function StudioPage() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();

  const traySnapIds = useTraySnapIds();
  const removeSnapsFromTray = useRemoveSnapsFromTray();
  const clearTray = useClearTray();
  const { startMovieFromTray } = useComposeMovie();
  const templateOffers = useTemplateOffers();
  const inProgress = useInProgressMovies();
  const ready = useReadyMovies();

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
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Spacing.six + topInset, paddingBottom: Spacing.seven + tabBarHeight },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="title">스튜디오</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          작업 중 {inProgress.length} · 담은 스냅 {traySnapIds.length}
        </ThemedText>
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

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <ThemedText type="smallBold">작업 중</ThemedText>
            <ThemedText type="edge" themeColor="textSecondary">
              {inProgress.length}
            </ThemedText>
          </View>
          {inProgress.length > 0 ? (
            inProgress.map((movie) => <MovieRow key={movie.id} movie={movie} onPress={openMovie} />)
          ) : (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                진행 중인 무비가 없어요.
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <ThemedText type="smallBold">최근 완성</ThemedText>
            {ready.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="무비 전체 보기"
                hitSlop={8}
                onPress={() => router.navigate('/movies')}
              >
                <ThemedText selectable={false} type="edge" themeColor="primary">
                  전체 보기
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          {ready.length > 0 ? (
            ready
              .slice(0, RecentReadyCount)
              .map((movie) => <MovieRow key={movie.id} movie={movie} onPress={openMovie} />)
          ) : (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                아직 완성한 무비가 없어요. 트레이나 템플릿으로 한 편 만들어 보세요.
              </ThemedText>
            </View>
          )}
        </View>
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
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.four,
    alignItems: 'center',
  },
});
