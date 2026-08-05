import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Movie } from '@/entities/movie';
import type { CutsRefusal, GenerationRefusal } from '@/features/compose-movie';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { MovieSharing } from '../model/use-share-movie';
import { CutsRefusalMessages, GenerationRefusalMessages, RefusalNotice } from './refusal-notice';

export type GenerateFooterProps = {
  movie: Movie;
  /** Cuts the movie holds; nothing to generate is a refusal, not a run. */
  cutCount: number;
  /** Why the last attempt to start was refused, if it was. */
  refusal: GenerationRefusal | undefined;
  /** Why the last cut edit was refused, if it was. */
  cutsRefusal: CutsRefusal | undefined;
  sharing: MovieSharing;
  /**
   * The selected cut's controls, standing in for the action row while a cut
   * is held. The notices above the slot stay either way — a refused cut edit
   * has to be answered exactly while a cut is selected.
   */
  inspector?: ReactNode;
  onStart: () => void;
};

/**
 * Handing the movie to the AI — the fixed bar under the timeline (concept §6
 * step ③). The first run, a retry after a failure, and a remake after an edit
 * are the same act on the same button; what changes is the label and, for a
 * failure, the stored reason above it.
 *
 * The action row is a fixed-height slot: while a cut is selected it hands its
 * place to the cut inspector instead of stacking above or below it, so taking
 * and releasing a cut never changes this zone's height — the stage above is
 * sized by what the zones below leave over, and a row that came and went made
 * the video jump. Deselecting (a tap on the strip's empty space) brings the
 * generate button back.
 *
 * The button and what refused it, and nothing else. A summary line under it
 * used to restate the configuration (컷 수, 길이, 스타일, 음악) and the standing
 * caveats about how long a run takes and how little it really does; on a screen
 * whose stage lives on leftover height, three lines of prose that the strip, the
 * chips, and the progress panel each already say cost more than they told.
 */
export function GenerateFooter({
  movie,
  cutCount,
  refusal,
  cutsRefusal,
  sharing,
  inspector,
  onStart,
}: GenerateFooterProps) {
  const theme = useTheme();
  const hasFailed = movie.status === 'failed';
  const isReady = movie.status === 'ready';

  return (
    <View style={styles.footer}>
      {hasFailed ? (
        // The stored reason, not a generic apology: the user has to know
        // whether running it again is worth anything, and today's one failure
        // is only answered by putting cuts back first.
        <View style={[styles.notice, { borderColor: theme.danger }]}>
          <ThemedText type="small" themeColor="danger">
            {movie.error ?? '알 수 없는 이유로 생성이 멈췄어요.'}
          </ThemedText>
          {cutCount === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              타임라인의 +로 스냅을 다시 넣으면 그대로 다시 시도할 수 있어요.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {cutsRefusal ? <RefusalNotice message={CutsRefusalMessages[cutsRefusal]} /> : null}

      {refusal ? <RefusalNotice message={GenerationRefusalMessages[refusal]} /> : null}

      <View style={styles.actionSlot}>
        {inspector ?? (
          <View style={styles.actions}>
            {isReady ? (
              <SnaplyButton
                title="공유"
                variant="secondary"
                disabled={sharing.blocked !== undefined}
                onPress={sharing.share}
                style={styles.share}
              />
            ) : null}
            <SnaplyButton
              title={
                hasFailed ? '다시 시도' : isReady ? '이 구성으로 다시 만들기' : 'AI로 생성 시작'
              }
              variant="ai"
              disabled={cutCount === 0}
              onPress={onStart}
              style={styles.generate}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { gap: Spacing.two },
  // One button tall (`SnaplyButton` minHeight), whichever occupant is in.
  actionSlot: { minHeight: 56, justifyContent: 'center' },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  share: { flexBasis: '32%' },
  generate: { flex: 1 },
});
