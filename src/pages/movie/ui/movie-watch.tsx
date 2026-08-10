import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { movieBgmLabel, movieStyleLabel, type Movie } from '@/entities/movie';
import type { RenderSource } from '@/features/compose-movie';
import type { MovieSharing } from '@/features/share-movie';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { toPlaybackCuts } from '../model/playback-cuts';
import type { Cut } from '../model/use-movie-cuts';
import { watchDurationSec } from '../model/watch-cuts';
import { CutPlayer } from './cut-player';
import { RenderPlayer } from './render-player';

export type MovieWatchProps = {
  movie: Movie;
  /** The finished composition's cuts — the render snapshot when one exists. */
  cuts: Cut[];
  /**
   * The rendered file, resolved to a fresh address — the page resolves it once
   * and 공유 uses the same source, so the stage and the share can never
   * disagree about which file the render is.
   */
  renderSource: RenderSource;
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
 * The stage plays the finished movie, in whichever form the run left it:
 * the rendered file as one video when the render has one (`render.uri`), and
 * the render's own cut composition back to back when it does not (mock mode,
 * renders from before the backend composited anything). Fixing the movie is
 * the studio's job either way — its stage keeps playing the *editable* cuts,
 * which is what a change is judged against before paying for a run.
 *
 * A drifted cut list says so here too: the stage plays what was made, so
 * edits kept for later (`editedSinceRender`) are invisible on this face —
 * without the notice, the only place that admits they exist is the studio
 * the user just chose to leave.
 */
export function MovieWatch({
  movie,
  cuts,
  renderSource,
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
        {renderSource.resolving ? (
          // A fresh address is on its way; opening the cut player meanwhile
          // would flash the raw material before the finished movie.
          <View style={[styles.playerBox, styles.resolving, { backgroundColor: theme.media }]}>
            <ThemedText selectable={false} style={styles.resolvingText}>
              불러오는 중…
            </ThemedText>
          </View>
        ) : renderSource.uri !== undefined ? (
          <View style={styles.playerBox}>
            <RenderPlayer uri={renderSource.uri} style={styles.player} />
          </View>
        ) : playbackCuts.length > 0 ? (
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
          // The file downloads to the cache before the sheet can open, so the
          // button says what the wait is instead of looking ignored.
          title={sharing.busy ? '공유 준비 중…' : '공유'}
          variant="secondary"
          disabled={sharing.blocked !== undefined || sharing.busy}
          onPress={sharing.share}
        />
        {sharing.blocked !== undefined ? (
          <ThemedText type="note" themeColor="textSecondary" style={styles.centerText}>
            아직 완성 파일이 만들어지지 않아 공유할 수 없어요.
          </ThemedText>
        ) : sharing.failed ? (
          <ThemedText type="note" themeColor="textSecondary" style={styles.centerText}>
            완성 파일을 내려받지 못했어요. 연결을 확인하고 다시 시도해주세요.
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
  resolving: {
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Over the stage's media backdrop, same as RenderPlayer's own state text.
  resolvingText: { color: '#FFFFFF' },
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
