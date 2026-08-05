import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { movieBgmLabel, movieStyleLabel } from '@/entities/movie';
import { useComposeMovie, type GenerationRefusal } from '@/features/compose-movie';
import { RenameMovieSheet } from '@/features/rename-movie';
import { BackBar } from '@/shared/ui/back-bar';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { toCutIndex, toPlaybackCuts, toPlaybackIndex } from '../model/playback-cuts';
import type { TimelinePlayhead } from '../model/timeline-layout';
import { useMovieCuts } from '../model/use-movie-cuts';
import { useShareMovie } from '../model/use-share-movie';
import { CutInspector } from './cut-inspector';
import { CutPlayer, type CutPlayerHandle } from './cut-player';
import { DetailSheet } from './detail-sheet';
import { GenerateFooter } from './generate-footer';
import { GenerationProgress } from './generation-progress';
import { CutsRefusalMessages, RefusalNotice } from './refusal-notice';
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
 * timeline, and the selected cut's controls stand in for the footer's generate
 * button while a cut is held, so an edit and its result are one glance apart
 * instead of a scroll apart — and taking or releasing a cut swaps a fixed
 * slot's occupant instead of adding and removing a row. Edits commit
 * as they land and the transport under the stage walks them back and forward
 * (되돌리기/복원) — there is no staged copy and no save button. Style and 세부
 * live in sheets opened from chips — settings are visited, cuts are worked on.
 *
 * The stage gets the height every other zone leaves over, so nothing here is
 * allowed to cost a row twice. The movie's name and its rename action ride the
 * back bar; the status line under the title and the footer's summary line are
 * both gone, because between them they only restated what the zones already
 * show — the strip draws the cuts on a seconds ruler, the chips carry the
 * current style and track, the ring says a job is running, and the footer's
 * notice says why one failed.
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
  const { saveStyle, setArranger, startGeneration } = useComposeMovie();
  const list = useMovieCuts(movieId);
  const { movie, cuts, totalSec, canEdit, refusal } = list;
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
  // Mirrors the stage, for the transport's play/pause button.
  const [isPlaying, setIsPlaying] = useState(false);
  // Where the stage is, for the strip's playhead. The player reports it; a strip
  // tap or scrub sets it up front so the timeline settles on the picked moment
  // without waiting for the seek to land, and so a dead cut — which the stage
  // cannot follow — still moves the playhead.
  const [playhead, setPlayhead] = useState<TimelinePlayhead>({ index: 0, secIntoCut: 0 });

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

  const addSnaps = () =>
    router.push({ pathname: '/snaps', params: { select: '1', for: movie.id } });

  const runGeneration = () => {
    const outcome = startGeneration(movie.id);
    setGenerationRefusal(outcome.refused);
  };

  // A strip tap selects the cut and shows its frame, paused — playing is the
  // transport's job. A dead cut is still selectable — the inspector is where it
  // is removed — the stage just cannot follow it there.
  const selectCut = (index: number) => {
    setSelectedIndex(index);
    setPlayhead({ index, secIntoCut: 0 });
    const playbackIndex = toPlaybackIndex(cuts, index);
    if (playbackIndex !== undefined) playerRef.current?.jumpTo(playbackIndex);
  };

  // A tap on the strip's empty space lets go of the cut: the trim handles
  // retract and the inspector row closes. The playhead stays put — releasing
  // a cut is not a seek. Playback re-selects on its own (`onCutChange`).
  const deselectCut = () => setSelectedIndex(-1);

  // A strip drag come to rest: whatever moment stopped under the playhead
  // becomes the playback position, paused on its frame — playing stays the
  // transport's job. Selection follows so the inspector talks about the cut
  // being scrubbed. A dead cut can be landed on but not shown; the playhead
  // and selection still move so the inspector can offer its removal.
  const scrubTo = (target: TimelinePlayhead) => {
    if (target.index < 0) return;
    setSelectedIndex(target.index);
    setPlayhead(target);
    const playbackIndex = toPlaybackIndex(cuts, target.index);
    if (playbackIndex !== undefined) playerRef.current?.seekTo(playbackIndex, target.secIntoCut);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* The movie names itself on the bar rather than in a row of its own —
          this screen spends every dp it can on the stage. */}
      <BackBar
        onPress={goBack}
        title={movie.title}
        action={{ icon: 'pencil', label: '무비 이름 바꾸기', onPress: () => setRenaming(true) }}
      />

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
              onProgress={(playbackIndex, secIntoCut) =>
                setPlayhead({ index: toCutIndex(cuts, playbackIndex), secIntoCut })
              }
              onPlayingChange={setIsPlaying}
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

      {/* The transport, right under the stage: play on the left, the edit
          history on the right — watching and undoing are both about what the
          stage just showed. */}
      {!isGenerating ? (
        <View style={styles.transport}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? '일시정지' : '재생'}
            accessibilityState={{ disabled: playbackCuts.length === 0 }}
            disabled={playbackCuts.length === 0}
            onPress={() => playerRef.current?.togglePlayback()}
            style={[
              styles.transportTool,
              { borderColor: theme.border, opacity: playbackCuts.length === 0 ? 0.35 : 1 },
            ]}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={theme.text} />
          </Pressable>

          {canEdit ? (
            <View style={styles.historyTools}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="되돌리기"
                accessibilityState={{ disabled: !list.canUndo }}
                disabled={!list.canUndo}
                onPress={list.undo}
                style={[
                  styles.transportTool,
                  { borderColor: theme.border, opacity: list.canUndo ? 1 : 0.35 },
                ]}
              >
                <Ionicons name="arrow-undo" size={18} color={theme.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="복원하기"
                accessibilityState={{ disabled: !list.canRedo }}
                disabled={!list.canRedo}
                onPress={list.redo}
                style={[
                  styles.transportTool,
                  { borderColor: theme.border, opacity: list.canRedo ? 1 : 0.35 },
                ]}
              >
                <Ionicons name="arrow-redo" size={18} color={theme.text} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <TimelineStrip
        cuts={cuts}
        selectedIndex={selected}
        playhead={playhead}
        isPlaying={isPlaying}
        canEdit={canEdit}
        onSelect={selectCut}
        onScrub={scrubTo}
        onDeselect={deselectCut}
        onTrim={list.trimCut}
        onAddSnaps={addSnaps}
      />

      <View style={styles.content}>
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
        {/* An edit refused while the footer's own notices are hidden (a job
            owns the movie) still has to be answered somewhere. */}
        {isGenerating && refusal ? <RefusalNotice message={CutsRefusalMessages[refusal]} /> : null}

        {isGenerating ? null : (
          <GenerateFooter
            movie={movie}
            cutCount={cuts.length}
            refusal={generationRefusal}
            cutsRefusal={refusal}
            sharing={sharing}
            onStart={runGeneration}
            // The selected cut's controls take the generate button's slot
            // rather than a row of their own: the slot's height is fixed, so
            // selecting and releasing a cut cannot resize the zones the stage
            // is sized against.
            inspector={
              canEdit && selected >= 0 ? (
                <CutInspector
                  cut={cuts[selected]}
                  index={selected}
                  count={cuts.length}
                  canRemove={cuts.length > 1}
                  onMove={(index, direction) => {
                    list.moveCut(index, direction);
                    setSelectedIndex(index + direction);
                  }}
                  onRemove={list.removeCut}
                  onResetTrim={list.resetTrim}
                />
              ) : undefined
            }
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
  transport: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
  },
  historyTools: { flexDirection: 'row', gap: Spacing.two },
  transportTool: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
