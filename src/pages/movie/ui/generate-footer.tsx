import { StyleSheet, View } from 'react-native';

import {
  MovieGenerationTotalMs,
  movieBgmLabel,
  movieStyleLabel,
  type Movie,
} from '@/entities/movie';
import type { CutsRefusal, GenerationRefusal } from '@/features/compose-movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { MovieSharing } from '../model/use-share-movie';

export type GenerateFooterProps = {
  movie: Movie;
  /** Cuts the movie holds, and how long they play. */
  cutCount: number;
  totalSec: number;
  /** Why the last attempt to start was refused, if it was. */
  refusal: GenerationRefusal | undefined;
  /** Why the last cut edit was refused, if it was. */
  cutsRefusal: CutsRefusal | undefined;
  sharing: MovieSharing;
  onStart: () => void;
};

const GenerationRefusalMessages: Record<GenerationRefusal, string> = {
  empty: '컷이 하나도 없어서 만들 수 없어요. 스냅을 먼저 넣어주세요.',
  frozen: '이미 만드는 중이에요.',
};

const CutsRefusalMessages: Record<CutsRefusal, string> = {
  empty: '컷이 최소 1개는 있어야 해요.',
  full: '한 편에 들어가는 스냅 수를 넘었어요.',
  frozen: '만드는 동안에는 컷을 고칠 수 없어요.',
};

/**
 * Handing the movie to the AI — the fixed bar under the timeline (concept §6
 * step ③). The first run, a retry after a failure, and a remake after an edit
 * are the same act on the same button; what changes is the label and, for a
 * failure, the stored reason above it.
 *
 * The summary line under the button is the whole configuration in one glance —
 * what the sheets hold, without opening them.
 */
export function GenerateFooter({
  movie,
  cutCount,
  totalSec,
  refusal,
  cutsRefusal,
  sharing,
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

      {cutsRefusal ? (
        <View
          style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}
        >
          <ThemedText type="small">{CutsRefusalMessages[cutsRefusal]}</ThemedText>
        </View>
      ) : null}

      {refusal ? (
        <View
          style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}
        >
          <ThemedText type="small">{GenerationRefusalMessages[refusal]}</ThemedText>
        </View>
      ) : null}

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
          title={hasFailed ? '다시 시도' : isReady ? '이 구성으로 다시 만들기' : 'AI로 생성 시작'}
          variant="ai"
          disabled={cutCount === 0}
          onPress={onStart}
          style={styles.generate}
        />
      </View>

      <ThemedText type="xsmall" themeColor="textSecondary" style={styles.hint}>
        {`컷 ${cutCount}개 · ${formatSeconds(totalSec)} · ${movieStyleLabel(movie.style)} · ${movieBgmLabel(movie.bgm)}`}
        {'\n'}
        {isReady
          ? '지금 완성본은 새로 만든 것으로 바뀌어요. '
          : `보통 ${Math.round(MovieGenerationTotalMs / 1000)}초쯤 걸리고, 앱을 나가도 계속돼요. `}
        아직 프로토타입 — 합성 없이 컷을 순서대로 이어 재생해요.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { gap: Spacing.two },
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
  hint: { textAlign: 'center' },
});
