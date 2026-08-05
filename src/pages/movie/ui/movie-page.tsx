import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useComposeMovie, type GenerationRefusal } from '@/features/compose-movie';
import { RenameMovieSheet } from '@/features/rename-movie';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { BackBar } from '@/shared/ui/back-bar';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useMovieCuts } from '../model/use-movie-cuts';
import { useMoviePlayback } from '../model/use-movie-playback';
import { useShareMovie } from '../model/use-share-movie';
import { ArrangementRow } from './arrangement-row';
import { CutList } from './cut-list';
import { CutPlayer } from './cut-player';
import { GeneratePanel } from './generate-panel';
import { StylePanel } from './style-panel';

export type MoviePageProps = {
  movieId?: string;
};

/** Row padding plus its two hairline borders, taken off the content column. */
const RowInset = Spacing.two * 2 + 2;

/**
 * One movie, at whatever point of its life it is at.
 *
 * There is no separate editor screen and no separate playback screen, because there is
 * no separate object: a movie is picked, run, watched, fixed, and run again, and
 * splitting that across two routes would have meant two places that can edit the
 * same cut list. What changes with the status is only which parts are here, and
 * whether they are controls or a read-out:
 *
 * - `draft` — the composition as controls: cut order, lengths, and style are
 *   settled here, before the slow run is paid for, and the button runs it.
 * - `generating` — the progress the user came back to see. Leaving is expected.
 * - `ready` — the movie plays, and the cut list, the style panel, and "다시
 *   만들기" become the way to say "not like that".
 * - `failed` — the same controls, led by the reason and a retry.
 */
export function MoviePage({ movieId }: MoviePageProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { saveStyle, setArranger, startGeneration } = useComposeMovie();
  const list = useMovieCuts(movieId);
  const playback = useMoviePlayback(movieId);
  const { movie, cuts, totalSec, isDirty, canEdit, refusal } = list;
  const sharing = useShareMovie(movie);

  const [renaming, setRenaming] = useState(false);
  const [generationRefusal, setGenerationRefusal] = useState<GenerationRefusal>();

  // A direct link can land here with nothing behind it, and the screen has no
  // navigation bar to fall back on — so going back means the studio.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!movie) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <BackBar onPress={goBack} />
        <View style={[styles.screen, styles.centered]}>
          <ThemedText type="heading">무비를 찾을 수 없어요</ThemedText>
          <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
        </View>
      </View>
    );
  }

  // Derived rather than measured (the content column is centered, capped, and
  // padded) so a trim bar lays out correctly on its first frame.
  const trimWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.five * 2 - RowInset;

  const isGenerating = movie.status === 'generating';
  const isReady = movie.status === 'ready';
  // A run in flight, or one that has just broken, is the news. Otherwise the
  // material comes first and the button that runs it comes after it.
  const leadWithGeneration = isGenerating || movie.status === 'failed';

  const subtitle = () => {
    if (isDirty) return '저장하지 않은 변경이 있어요';
    if (isGenerating) return '만드는 중이에요';
    if (movie.status === 'failed') return '만들지 못했어요';
    if (isReady && movie.render) {
      return `컷 ${cuts.length}개 · ${formatSeconds(totalSec)} · ${formatDateTime(movie.render.renderedAt)} 완성`;
    }
    return `컷 ${cuts.length}개 · ${formatSeconds(totalSec)} · 아직 만들지 않았어요`;
  };

  const addSnaps = () =>
    router.push({ pathname: '/snaps', params: { select: '1', for: movie.id } });

  const runGeneration = () => {
    const outcome = startGeneration(movie.id);
    setGenerationRefusal(outcome.refused);
  };

  const generatePanel = (
    <GeneratePanel
      movie={movie}
      cutCount={cuts.length}
      totalSec={totalSec}
      refusal={generationRefusal}
      hasUnsavedCuts={isDirty}
      onStart={runGeneration}
    />
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BackBar onPress={goBack} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Spacing.seven }]}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <ThemedText type="title" numberOfLines={1}>
              {movie.title}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor={movie.status === 'failed' ? 'danger' : 'textSecondary'}
            >
              {subtitle()}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="무비 이름 바꾸기"
            hitSlop={8}
            onPress={() => setRenaming(true)}
          >
            <ThemedText selectable={false} type="smallBold" themeColor="primary">
              이름
            </ThemedText>
          </Pressable>
        </View>

        {leadWithGeneration ? generatePanel : null}

        {/* Watching comes before fixing: on a draft the player previews the cuts
            the run will be built from, and on a result it is what the cut list
            and the style panel below it are reactions to. A movie whose
            originals are all gone says so instead. */}
        {canEdit ? (
          playback.cuts.length > 0 ? (
            <CutPlayer cuts={playback.cuts} />
          ) : (
            <View style={[styles.empty, { borderColor: theme.border }]}>
              <ThemedText type="heading">재생할 컷이 없어요</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                이 무비가 쓰던 스냅 원본이 모두 지워졌어요.
              </ThemedText>
            </View>
          )
        ) : null}

        <CutList
          cuts={cuts}
          totalSec={totalSec}
          canEdit={canEdit}
          refusal={refusal}
          trimWidth={trimWidth}
          onMove={list.moveCut}
          onRemove={list.removeCut}
          onTrim={list.trimCut}
          onResetTrim={list.resetTrim}
          onAddSnaps={addSnaps}
        />

        {canEdit ? (
          <ArrangementRow
            movie={movie}
            onChange={(locked) => setArranger(movie.id, locked ? 'user' : 'ai')}
          />
        ) : null}

        {canEdit ? (
          <StylePanel
            movie={movie}
            totalSec={totalSec}
            canEdit={canEdit}
            onChange={(patch) => saveStyle(movie.id, patch)}
          />
        ) : null}

        {leadWithGeneration ? null : generatePanel}

        {isReady ? (
          <>
            <SnaplyButton
              title="무비 공유"
              variant="secondary"
              disabled={sharing.blocked !== undefined}
              onPress={sharing.share}
            />
            {sharing.blocked === 'no-render' ? (
              <ThemedText type="small" themeColor="textSecondary">
                내보낼 파일이 없어서 공유는 아직 눌러지지 않아요 — 합성이 붙는 순간 열립니다.
              </ThemedText>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {isDirty ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.four,
            },
          ]}
        >
          <View style={styles.footerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="변경 취소"
              onPress={list.discard}
              style={[styles.secondaryAction, { borderColor: theme.border }]}
            >
              <ThemedText selectable={false} type="button" themeColor="textSecondary">
                되돌리기
              </ThemedText>
            </Pressable>
            <SnaplyButton
              title="컷 구성 저장"
              onPress={() => list.save()}
              style={styles.primaryAction}
            />
          </View>
        </View>
      ) : null}

      {/* Keyed by the movie so the field opens on the name that is stored now. */}
      <RenameMovieSheet
        key={`${movie.id}:${movie.title}`}
        visible={renaming}
        movieId={movie.id}
        title={movie.title}
        onClose={() => setRenaming(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.six,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    // The back arrow above carries its own padding, so the title needs only the
    // gap that keeps it off the glyph.
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerCopy: { flex: 1, gap: Spacing.half },
  centerText: { textAlign: 'center' },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  primaryAction: { flex: 1 },
  secondaryAction: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
