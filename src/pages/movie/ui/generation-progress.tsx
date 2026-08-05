import { StyleSheet, View } from 'react-native';

import { MovieGenerationSteps, movieJobProgressAt, type Movie } from '@/entities/movie';
import { Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useJobClock } from '../model/use-job-clock';
import { ProgressRing } from './progress-ring';

export type GenerationProgressProps = {
  /** A movie a job owns; the page mounts this only while one does. */
  movie: Movie;
};

const RingSize = 132;

/**
 * The progress the user came back to see — the ring and the five steps, in the
 * stage where the player otherwise sits. Leaving is expected and safe: the job
 * belongs to the movie, not to this screen (`MovieGenerationGate`), so the ring
 * picks up where it left off on the way back.
 *
 * **Nothing is composited.** No renderer exists yet, so the steps are paced by
 * the job clock and a finished movie is played by running its cuts in order.
 * The screen no longer says so in prose — the footer's caveat line went with
 * the rest of the summary — so [the feature doc](../../../../docs/features/movie.md)
 * is where that limit is written down.
 */
export function GenerationProgress({ movie }: GenerationProgressProps) {
  const theme = useTheme();
  const isRunning = movie.status === 'generating' && movie.job !== undefined;
  const now = useJobClock(isRunning);

  if (!isRunning || !movie.job) return null;
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

      <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
        앱을 나가도 계속돼요. 다 되면 스튜디오와 무비 탭에서 완성본을 볼 수 있어요.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.three, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  ringRow: { alignItems: 'center', paddingVertical: Spacing.three },
  checklist: { gap: Spacing.two, alignSelf: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
});
