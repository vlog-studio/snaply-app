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

export type GenerateStepProps = {
  movie: Movie;
  /** Cuts the movie holds, and how long they play. */
  cutCount: number;
  totalSec: number;
  refusal: GenerationRefusal | undefined;
  onStart: () => void;
  onWatch: () => void;
};

const RingSize = 132;

const RefusalMessages: Record<GenerationRefusal, string> = {
  empty: '컷이 하나도 없어서 생성할 수 없어요. ①에서 스냅을 넣어주세요.',
  frozen: '이미 생성이 시작된 무비예요.',
};

/**
 * Step ③ — handing the movie to the AI (concept §6).
 *
 * Three states in one screen, because they are three points in one wait: ready to
 * run, running, and done. Leaving mid-job is expected and safe — the job belongs
 * to the movie, not to this screen (`MovieGenerationGate`), so the ring picks up
 * where it left off on the way back.
 *
 * **Nothing is composited.** No renderer exists yet, so the steps are paced by the
 * job clock and a finished movie is played by running its cuts in order. The
 * screen says so rather than implying a file was produced.
 */
export function GenerateStep({
  movie,
  cutCount,
  totalSec,
  refusal,
  onStart,
  onWatch,
}: GenerateStepProps) {
  const theme = useTheme();
  const isRunning = movie.status === 'generating' && movie.job !== undefined;
  const now = useJobClock(isRunning);

  const recipe = `컷 ${cutCount}개 · ${formatSeconds(totalSec)} · ${movieStyleLabel(movie.style)} · ${movieBgmLabel(movie.bgm)}`;

  if (movie.status === 'ready') {
    return (
      <View style={styles.step}>
        <ThemedText type="heading">완성됐어요</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {recipe}
        </ThemedText>
        <SnaplyButton title="무비 보기" variant="ai" onPress={onWatch} />
        <ThemedText type="small" themeColor="textSecondary">
          컷을 다시 고치거나 다른 스타일로 다시 만드는 건 다음 단계에서 붙어요.
        </ThemedText>
      </View>
    );
  }

  if (isRunning && movie.job) {
    const progress = movieJobProgressAt(movie.job.startedAt, now);
    return (
      <View style={styles.step}>
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

  return (
    <View style={styles.step}>
      <ThemedText type="heading">준비됐어요</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {recipe}
      </ThemedText>

      {refusal ? (
        <View style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}>
          <ThemedText type="small">{RefusalMessages[refusal]}</ThemedText>
        </View>
      ) : null}

      <SnaplyButton
        title="AI로 생성 시작"
        variant="ai"
        disabled={cutCount === 0}
        onPress={onStart}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {`보통 ${Math.round(MovieGenerationTotalMs / 1000)}초쯤 걸려요. 앱을 나가도 계속됩니다.`}
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
  step: { gap: Spacing.three },
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
