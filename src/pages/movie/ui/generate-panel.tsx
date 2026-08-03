import { StyleSheet, View } from 'react-native';

import {
  MovieGenerationSteps,
  MovieGenerationTotalMs,
  movieJobProgressAt,
  movieBgmLabel,
  movieStyleLabel,
  type Movie,
} from '@/entities/movie';
import type { GenerationRefusal } from '@/features/compose-movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useJobClock } from '../model/use-job-clock';
import { ProgressRing } from './progress-ring';

export type GeneratePanelProps = {
  movie: Movie;
  /** Cuts the movie holds, and how long they play. */
  cutCount: number;
  totalSec: number;
  /** Why the last attempt to start was refused, if it was. */
  refusal: GenerationRefusal | undefined;
  /** Set when cut edits are staged — running now would ignore them. */
  hasUnsavedCuts: boolean;
  onStart: () => void;
};

const RingSize = 132;

const RefusalMessages: Record<GenerationRefusal, string> = {
  empty: '컷이 하나도 없어서 만들 수 없어요. 스냅을 먼저 넣어주세요.',
  frozen: '이미 만드는 중이에요.',
};

/**
 * Handing the movie to the AI — the first time, again after a failure, or again
 * because the user changed something (concept §6 step ③).
 *
 * Four states in one panel, because they are four points in one loop: ready to
 * run, running, done (so run it again), and broken. Leaving mid-job is expected
 * and safe — the job belongs to the movie, not to this screen
 * (`MovieGenerationGate`), so the ring picks up where it left off on the way back.
 *
 * **Nothing is composited.** No renderer exists yet, so the steps are paced by the
 * job clock and a finished movie is played by running its cuts in order. The
 * panel says so rather than implying a file was produced.
 */
export function GeneratePanel({
  movie,
  cutCount,
  totalSec,
  refusal,
  hasUnsavedCuts,
  onStart,
}: GeneratePanelProps) {
  const theme = useTheme();
  const isRunning = movie.status === 'generating' && movie.job !== undefined;
  const now = useJobClock(isRunning);

  if (isRunning && movie.job) {
    const progress = movieJobProgressAt(movie.job.startedAt, now);
    return (
      <View style={styles.panel}>
        <View style={styles.ringRow}>
          <ProgressRing progress={progress.ratio} size={RingSize} />
        </View>
        <ThemedText type="heading" style={styles.centerText}>
          만드는 중…
        </ThemedText>

        <View style={styles.checklist}>
          {MovieGenerationSteps.map((label, index) => {
            const done = index < progress.stepIndex;
            const current = index === progress.stepIndex;
            return (
              <View key={label} style={styles.checkRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      borderColor: done || current ? theme.ai : theme.border,
                      backgroundColor: done ? theme.ai : 'transparent',
                    },
                  ]}
                />
                <ThemedText
                  selectable={false}
                  type="small"
                  themeColor={current ? 'text' : 'textSecondary'}
                >
                  {label}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          앱을 나가도 계속돼요. 다 되면 스튜디오와 무비 탭에서 완성본을 볼 수 있어요.
        </ThemedText>
      </View>
    );
  }

  const hasFailed = movie.status === 'failed';
  const isRemake = movie.status === 'ready';

  return (
    <View style={styles.panel}>
      {hasFailed ? (
        <>
          <ThemedText type="heading">만들지 못했어요</ThemedText>
          {/* The stored reason, not a generic apology: the user has to know
              whether running it again is worth anything, and today's one failure
              is only answered by putting cuts back first. */}
          <View style={[styles.notice, { borderColor: theme.danger }]}>
            <ThemedText type="small" themeColor="danger">
              {movie.error ?? '알 수 없는 이유로 생성이 멈췄어요.'}
            </ThemedText>
            {cutCount === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                아래에서 스냅을 다시 넣으면 그대로 다시 시도할 수 있어요.
              </ThemedText>
            ) : null}
          </View>
        </>
      ) : null}

      {isRemake ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          {`컷 ${cutCount}개 · ${formatSeconds(totalSec)} · ${movieStyleLabel(movie.style)} · ${movieBgmLabel(movie.bgm)}`}
        </ThemedText>
      )}

      {refusal ? (
        <View
          style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}
        >
          <ThemedText type="small">{RefusalMessages[refusal]}</ThemedText>
        </View>
      ) : null}

      {hasUnsavedCuts ? (
        <View
          style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}
        >
          <ThemedText type="small">
            저장하지 않은 컷 변경이 있어요. 저장해야 그 구성으로 만들어져요.
          </ThemedText>
        </View>
      ) : null}

      <SnaplyButton
        title={hasFailed ? '다시 시도' : isRemake ? '이 구성으로 다시 만들기' : 'AI로 생성 시작'}
        variant="ai"
        disabled={cutCount === 0}
        onPress={onStart}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {isRemake
          ? `지금 완성본은 새로 만든 것으로 바뀌어요. 보통 ${Math.round(MovieGenerationTotalMs / 1000)}초쯤 걸립니다.`
          : `보통 ${Math.round(MovieGenerationTotalMs / 1000)}초쯤 걸려요. 앱을 나가도 계속됩니다.`}
      </ThemedText>
      <View style={[styles.notice, { borderColor: theme.border }]}>
        <ThemedText type="edge" themeColor="lumen">
          아직 프로토타입
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          실제 영상 합성은 아직 일어나지 않아요. 진행 단계는 시늉이고, 완성된 무비는 컷을 순서대로
          이어서 재생합니다.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.three },
  centerText: { textAlign: 'center' },
  ringRow: { alignItems: 'center', paddingVertical: Spacing.three },
  checklist: { gap: Spacing.two },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
