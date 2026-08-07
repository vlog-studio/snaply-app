import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { movieBgmLabel, movieStyleLabel, type Movie } from '@/entities/movie';
import type { MovieSharing } from '@/features/share-movie';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { toPlaybackCuts } from '../model/playback-cuts';
import type { Cut } from '../model/use-movie-cuts';
import { watchDurationSec } from '../model/watch-cuts';
import { CutPlayer } from './cut-player';

export type MovieWatchProps = {
  movie: Movie;
  /** The finished composition's cuts — the render snapshot when one exists. */
  cuts: Cut[];
  sharing: MovieSharing;
  /**
   * True when the stored cut list drifted from this render's composition —
   * the stage is playing the finished movie, not the edits.
   */
  editedSinceRender: boolean;
  /** Opens the studio on the edited composition. */
  onReviewEdits: () => void;
};

/**
 * A finished movie as something to watch, not something to fix — what fills
 * the screen below the back bar while a `ready` movie is in watch mode.
 *
 * The stage takes everything the two rows below leave over, exactly as the
 * studio's stage does, but nothing around it is a control surface: no
 * timeline, no transport, no chips, no inspector. Playing is the stage's own
 * tap. What the studio's chips and 세부 sheet carry as editable settings, the
 * one line under the stage states as facts — when it was finished, how long it
 * runs, and the style and track it was made with.
 *
 * 공유 is the mode's one standing action (editing, renaming, and deleting live
 * in the ⋯ sheet). It is visible but disabled until a render produces a real
 * file, the same idiom as the studio footer — with the reason written under
 * it, because a lone disabled primary action explains nothing by itself.
 *
 * A drifted cut list says so here too: the stage plays the render's own
 * composition, so edits kept for later (`editedSinceRender`) are invisible on
 * this face — without the notice, the only place that admits they exist is
 * the studio the user just chose to leave.
 */
export function MovieWatch({
  movie,
  cuts,
  sharing,
  editedSinceRender,
  onReviewEdits,
}: MovieWatchProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const playbackCuts = toPlaybackCuts(cuts);
  const totalSec = watchDurationSec(movie, cuts);

  const facts = [
    movie.render ? `${formatDateTime(movie.render.renderedAt)} 완성` : undefined,
    formatSeconds(totalSec),
    movieStyleLabel(movie.style),
    movieBgmLabel(movie.bgm),
  ].filter((fact) => fact !== undefined);

  return (
    <View style={styles.body}>
      <View style={styles.stage}>
        {playbackCuts.length > 0 ? (
          <View style={styles.playerBox}>
            <CutPlayer cuts={playbackCuts} style={styles.player} />
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

      <ThemedText type="small" themeColor="textSecondary" style={styles.facts}>
        {facts.join(' · ')}
      </ThemedText>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        {editedSinceRender ? (
          <View style={[styles.notice, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              편집한 컷 구성이 있어요. 다시 만들기 전까지는 완성 당시 구성으로 재생돼요.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="편집한 구성 확인하고 다시 만들기"
              onPress={onReviewEdits}
              hitSlop={Spacing.two}
              style={({ pressed }) => [styles.review, { opacity: pressed ? 0.7 : 1 }]}
            >
              <ThemedText selectable={false} type="smallBold" themeColor="primary">
                구성 확인하고 다시 만들기
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
        <SnaplyButton
          title="공유"
          variant="secondary"
          disabled={sharing.blocked !== undefined}
          onPress={sharing.share}
        />
        {sharing.blocked !== undefined ? (
          <ThemedText type="note" themeColor="textSecondary" style={styles.centerText}>
            아직 완성 파일이 만들어지지 않아 공유할 수 없어요.
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  stage: {
    flex: 1,
    minHeight: 160,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
  },
  // Height-bound like the studio stage: the leftover height and the 9:16 ratio
  // decide the width, so the rows below never leave the screen.
  playerBox: { flex: 1, aspectRatio: 9 / 16, maxWidth: '100%' },
  player: { width: '100%', height: '100%' },
  facts: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    textAlign: 'center',
    paddingHorizontal: Spacing.five,
  },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
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
  centerText: { textAlign: 'center' },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
  review: { alignSelf: 'flex-start' },
});
