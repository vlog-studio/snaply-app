import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { movieBgmLabel, movieStyleLabel } from '@/entities/movie';
import { useComposeMovie, type GenerationRefusal } from '@/features/compose-movie';
import { RenameMovieSheet } from '@/features/rename-movie';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { BackBar } from '@/shared/ui/back-bar';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { toCutIndex, toPlaybackCuts, toPlaybackIndex } from '../model/playback-cuts';
import { useMovieCuts } from '../model/use-movie-cuts';
import { useShareMovie } from '../model/use-share-movie';
import { CutInspector } from './cut-inspector';
import { CutPlayer, type CutPlayerHandle } from './cut-player';
import { DetailSheet } from './detail-sheet';
import { GenerateFooter } from './generate-footer';
import { GenerationProgress } from './generation-progress';
import { StylePickerSheet } from './style-picker-sheet';
import { TimelineStrip } from './timeline-strip';

export type MoviePageProps = {
  movieId?: string;
};

/**
 * One movie, at whatever point of its life it is at — laid out as a timeline
 * studio rather than a long scroll.
 *
 * The stage (the player) is always on screen, the cuts run under it as a
 * filmstrip, and the selected cut's controls sit between the two, so an edit
 * and its result are one glance apart instead of a scroll apart. The stage
 * previews the *working* cut list: a reorder, a trim, or a removal shows up in
 * it immediately, before the save commits anything. Style and 세부 live in
 * sheets opened from chips — settings are visited, cuts are worked on.
 *
 * There is still no separate editor screen and no separate playback screen,
 * because there is no separate object: a movie is picked, run, watched, fixed,
 * and run again. What changes with the status is what fills the stage and what
 * the footer offers:
 *
 * - `draft` — the stage previews the cuts, and the footer runs the first job.
 * - `generating` — the stage holds the progress ring; everything else is a
 *   read-out. Leaving is expected.
 * - `ready` — the stage plays the result, and the same controls plus "이
 *   구성으로 다시 만들기" are the way to say "not like that".
 * - `failed` — the same controls, led by the reason and a retry in the footer.
 */
export function MoviePage({ movieId }: MoviePageProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { saveStyle, setArranger, startGeneration } = useComposeMovie();
  const list = useMovieCuts(movieId);
  const { movie, cuts, totalSec, isDirty, canEdit, refusal } = list;
  const sharing = useShareMovie(movie);

  const [renaming, setRenaming] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [generationRefusal, setGenerationRefusal] = useState<GenerationRefusal>();

  // Which cut the strip and the inspector point at; the stage follows a tap and
  // the highlight follows playback. Clamped rather than reset when the list
  // shrinks, so removing a cut selects its neighbor instead of jumping home.
  const [selectedIndex, setSelectedIndex] = useState(0);
  const playerRef = useRef<CutPlayerHandle>(null);
  const selected = cuts.length > 0 ? Math.min(selectedIndex, cuts.length - 1) : -1;

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

  const playbackCuts = toPlaybackCuts(cuts);
  const isGenerating = movie.status === 'generating';

  // Derived rather than measured (the content column is centered, capped, and
  // padded) so the trim bar lays out correctly on its first frame.
  const trimWidth = Math.min(windowWidth, MaxContentWidth) - Spacing.five * 2;

  const subtitle = () => {
    if (isDirty) return '저장하지 않은 변경이 있어요';
    if (isGenerating) return '만드는 중이에요';
    if (movie.status === 'failed') return '만들지 못했어요';
    if (movie.status === 'ready' && movie.render) {
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

  // A strip tap selects the cut and jumps the stage to it. A dead cut is still
  // selectable — the inspector is where it is removed — the stage just cannot
  // follow it there.
  const selectCut = (index: number) => {
    setSelectedIndex(index);
    const playbackIndex = toPlaybackIndex(cuts, index);
    if (playbackIndex !== undefined) playerRef.current?.jumpTo(playbackIndex);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BackBar onPress={goBack} />

      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText type="heading" numberOfLines={1}>
            {movie.title}
          </ThemedText>
          <ThemedText
            type="xsmall"
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

      {/* The stage: the player on an editable movie, the ring under a job. It
          takes whatever height the timeline below leaves over. */}
      <View style={styles.stage}>
        {isGenerating ? (
          <ScrollView contentContainerStyle={styles.progressScroll}>
            <GenerationProgress movie={movie} />
          </ScrollView>
        ) : playbackCuts.length > 0 ? (
          <View style={styles.playerBox}>
            <CutPlayer
              ref={playerRef}
              cuts={playbackCuts}
              editIndex={selected >= 0 ? toPlaybackIndex(cuts, selected) : undefined}
              onCutChange={(playbackIndex) => setSelectedIndex(toCutIndex(cuts, playbackIndex))}
              style={styles.player}
            />
          </View>
        ) : (
          <View style={[styles.empty, { borderColor: theme.border }]}>
            <ThemedText type="heading">재생할 컷이 없어요</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.centerText}>
              이 무비가 쓰던 스냅 원본이 모두 지워졌어요.
            </ThemedText>
          </View>
        )}
      </View>

      <TimelineStrip
        cuts={cuts}
        selectedIndex={selected}
        canEdit={canEdit}
        onSelect={selectCut}
        onAddSnaps={addSnaps}
      />

      <View style={styles.content}>
        {canEdit && selected >= 0 ? (
          <CutInspector
            cut={cuts[selected]}
            index={selected}
            count={cuts.length}
            canEdit={canEdit}
            canRemove={cuts.length > 1}
            trimWidth={trimWidth}
            onMove={(index, direction) => {
              list.moveCut(index, direction);
              setSelectedIndex(index + direction);
            }}
            onRemove={list.removeCut}
            onTrim={list.trimCut}
            onResetTrim={list.resetTrim}
          />
        ) : null}

        {/* Settings are visited, cuts are worked on: the chips carry the current
            values so the sheets only need opening to change something. */}
        <View style={styles.chips}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`스타일 ${movieStyleLabel(movie.style)}`}
            onPress={() => setStyleOpen(true)}
            style={[styles.chip, { borderColor: theme.border }]}
          >
            <ThemedText selectable={false} type="smallBold">
              스타일
            </ThemedText>
            <ThemedText selectable={false} type="small" themeColor="textSecondary">
              {movieStyleLabel(movie.style)}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`세부 설정, 배경 음악 ${movieBgmLabel(movie.bgm)}`}
            onPress={() => setDetailOpen(true)}
            style={[styles.chip, { borderColor: theme.border }]}
          >
            <ThemedText selectable={false} type="smallBold">
              세부
            </ThemedText>
            <ThemedText selectable={false} type="small" themeColor="textSecondary">
              {movieBgmLabel(movie.bgm)}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.three,
          },
        ]}
      >
        {/* A commit refused while the footer's own notices are hidden (a job
            owns the movie) still has to be answered somewhere. */}
        {isGenerating && refusal ? (
          <View
            style={[
              styles.notice,
              { borderColor: theme.border, backgroundColor: theme.warmSurface },
            ]}
          >
            <ThemedText type="small">만드는 동안에는 컷을 고칠 수 없어요.</ThemedText>
          </View>
        ) : null}

        {isDirty ? (
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
        ) : null}

        {isGenerating ? null : (
          <GenerateFooter
            movie={movie}
            cutCount={cuts.length}
            totalSec={totalSec}
            refusal={generationRefusal}
            cutsRefusal={refusal}
            hasUnsavedCuts={isDirty}
            sharing={sharing}
            onStart={runGeneration}
          />
        )}
      </View>

      <StylePickerSheet
        visible={styleOpen}
        movie={movie}
        canEdit={canEdit}
        onChange={(patch) => saveStyle(movie.id, patch)}
        onClose={() => setStyleOpen(false)}
      />
      <DetailSheet
        visible={detailOpen}
        movie={movie}
        totalSec={totalSec}
        canEdit={canEdit}
        onChangeStyle={(patch) => saveStyle(movie.id, patch)}
        onChangeArranger={(locked) => setArranger(movie.id, locked ? 'user' : 'ai')}
        onClose={() => setDetailOpen(false)}
      />

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
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    // The back arrow above carries its own padding, so the title needs only the
    // gap that keeps it off the glyph.
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  headerCopy: { flex: 1, gap: Spacing.half },
  stage: {
    flex: 1,
    minHeight: 160,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  // Height-bound: the stage hands the player its leftover height and the 9:16
  // ratio sets the width, so the timeline never gets pushed off screen.
  playerBox: { flex: 1, aspectRatio: 9 / 16, maxWidth: '100%' },
  player: { width: '100%', height: '100%' },
  progressScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.four },
  centerText: { textAlign: 'center' },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  chips: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.two },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
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
