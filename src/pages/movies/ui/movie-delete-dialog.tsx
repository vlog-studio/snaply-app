import { Pressable, StyleSheet, View } from 'react-native';

import { formatSeconds } from '@/shared/lib/datetime';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import type { MovieSummary } from '@/widgets/movie-shelf';

export type MovieDeleteDialogProps = {
  visible: boolean;
  /** The movie the sheet talks about. Kept through the close animation. */
  movie?: MovieSummary;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Confirms deleting a movie, and says what stays.
 *
 * The reverse of the snap sheet: deleting a snap destroys the one thing every
 * movie built on it needs, so that sheet lists the damage — but a movie is only
 * a composition over snaps it never owned, so this sheet's job is reassurance,
 * naming the movie it takes and promising the originals survive. The one real
 * loss worth a warning of its own is a job in flight, which dies with the
 * movie that carries it.
 */
export function MovieDeleteDialog({ visible, movie, onCancel, onConfirm }: MovieDeleteDialogProps) {
  const theme = useTheme();
  if (!movie) return null;

  return (
    <BottomSheet accessibilityLabel="무비 삭제 확인" visible={visible} onClose={onCancel}>
      <ThemedText type="note" themeColor="danger">
        무비 삭제
      </ThemedText>
      <ThemedText type="heading">이 무비를 지울까요?</ThemedText>

      <View style={[styles.movie, { borderColor: theme.border }]}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {movie.title}
        </ThemedText>
        <ThemedText type="note" themeColor="textSecondary">
          컷 {movie.snapCount} · {formatSeconds(movie.totalSec)}
        </ThemedText>
      </View>

      <ThemedText themeColor="textSecondary">
        컷 구성과 완성 기록이 함께 사라져요. 스냅 원본 영상은 그대로 남아요.
      </ThemedText>

      {movie.status === 'generating' ? (
        <ThemedText type="small" themeColor="danger">
          지금 만드는 중인 작업도 함께 사라져요.
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="삭제 취소"
          onPress={onCancel}
          style={[styles.action, { borderColor: theme.border }]}
        >
          <ThemedText selectable={false} type="button">
            취소
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${movie.title} 삭제`}
          onPress={onConfirm}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: theme.danger,
              borderColor: theme.danger,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText selectable={false} type="button" style={{ color: theme.onPrimary }}>
            삭제
          </ThemedText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  movie: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    gap: Spacing.half,
  },
  actions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.one },
  action: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
