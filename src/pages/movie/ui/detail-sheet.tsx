import { Pressable, StyleSheet, Switch, View } from 'react-native';

import {
  MovieBgmCatalog,
  isAiArranged,
  type Movie,
  type MovieStylePatch,
} from '@/entities/movie';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type DetailSheetProps = {
  visible: boolean;
  movie: Movie;
  /** How long the cut list plays — what the target length reports. */
  totalSec: number;
  /** False while a job owns the movie; the settings become a read-out. */
  canEdit: boolean;
  onChangeStyle: (patch: MovieStylePatch) => void;
  onChangeArranger: (locked: boolean) => void;
  onClose: () => void;
};

/**
 * Everything about the movie that is not a cut and not the look: the sound,
 * the subtitles, who owns the cut order, and the read-outs — 비율, 목표 길이,
 * and, once there is a render, when it was finished.
 *
 * Every control writes straight through — nothing here is staged, so the sheet
 * can be opened, flipped, and dismissed without a save step. BGM is a row of
 * pills rather than a second sheet: a sheet stacked on a sheet is two dismiss
 * gestures deep, and five tracks fit on two lines.
 *
 * 순서 고정 lives here rather than beside the timeline because it is a rule
 * about the *next generation*, not about a cut: whether the run may re-arrange
 * what the strip shows. Rearranging a cut by hand already turns the lock on;
 * the switch exists so the order can be handed back.
 */
export function DetailSheet({
  visible,
  movie,
  totalSec,
  canEdit,
  onChangeStyle,
  onChangeArranger,
  onClose,
}: DetailSheetProps) {
  const theme = useTheme();
  const isLocked = !isAiArranged(movie);

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="세부 설정">
      <View style={styles.sheet}>
        <ThemedText type="heading">세부</ThemedText>

        <View style={styles.section}>
          <ThemedText type="smallBold">배경 음악</ThemedText>
          <View style={styles.trackWrap}>
            {MovieBgmCatalog.map((track) => {
              const selected = track.id === movie.bgm;
              return (
                <Pressable
                  key={track.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !canEdit }}
                  accessibilityLabel={track.label}
                  disabled={!canEdit}
                  onPress={() => onChangeStyle({ bgm: track.id })}
                  style={({ pressed }) => [
                    styles.trackPill,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      borderWidth: selected ? 2 : 1,
                      opacity: !canEdit && !selected ? 0.55 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    selectable={false}
                    type="small"
                    themeColor={selected ? 'primary' : 'text'}
                  >
                    {track.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.rows, { backgroundColor: theme.backgroundSelected }]}>
          <View style={styles.row}>
            <ThemedText type="small">자동 자막</ThemedText>
            <Switch
              accessibilityLabel="자동 자막"
              disabled={!canEdit}
              value={movie.captions}
              onValueChange={(captions) => onChangeStyle({ captions })}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.border}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <ThemedText type="small">순서 고정</ThemedText>
              <ThemedText type="xsmall" themeColor="textSecondary">
                {isLocked
                  ? '지금 순서 그대로 만들어져요.'
                  : 'AI가 정한 순서예요. 만들 때 찍은 시각 순서로 다시 배치돼요.'}
              </ThemedText>
            </View>
            <Switch
              accessibilityLabel="컷 순서 고정"
              disabled={!canEdit}
              value={isLocked}
              onValueChange={onChangeArranger}
              trackColor={{ true: theme.primary }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <ThemedText type="small">비율</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {movie.ratio}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <ThemedText type="small">목표 길이</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              컷 합계 ({formatSeconds(totalSec)})
            </ThemedText>
          </View>

          {/* When the movie was last finished. It reads out here rather than on
              the screen, where a whole row under the title bought one date. */}
          {movie.render ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.row}>
                <ThemedText type="small">완성</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDateTime(movie.render.renderedAt)}
                </ThemedText>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: Spacing.three },
  section: { gap: Spacing.two },
  trackWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  trackPill: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rows: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowCopy: { flex: 1, gap: Spacing.half },
  divider: { height: StyleSheet.hairlineWidth },
});
