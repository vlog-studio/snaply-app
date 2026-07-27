import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getCaptureMoodLabel } from '@/entities/capture-session';
import type { ClipOrientation } from '@/entities/clip';
import type { RollStatus } from '@/entities/roll';
import { formatRecordingDate } from '@/features/manage-recordings';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { StripCut } from '../model/use-cut-strip';

const OrientationLabels: Record<ClipOrientation, string> = {
  portrait: '세로',
  landscape: '가로',
  square: '정방',
};

const RollStatusLabels: Record<RollStatus, string> = {
  undeveloped: '미현상',
  developing: '현상 중',
  developed: '현상 완료',
};

type CutSheetProps = {
  cut: StripCut | undefined;
  /** False when the clip's metadata outlived its video file. */
  hasFile: boolean;
  isDeleting: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onClose: () => void;
};

/**
 * What one cut is and where it lives.
 *
 * The roll list is the point: a cut can sit in several rolls at once, and this
 * is the only place that whole membership is spelled out rather than compressed
 * into dots. A developed roll's row says its membership is frozen — its reel is
 * a finished artifact, the same rule roll detail enforces for editing.
 *
 * Taking the cut out of one roll, and putting it into another, arrive with the
 * write step; this sheet reads.
 */
export function CutSheet({
  cut,
  hasFile,
  isDeleting,
  onPlay,
  onDelete,
  onClose,
}: CutSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet visible={Boolean(cut)} onClose={onClose} accessibilityLabel="컷 정보">
      {cut ? (
        <View style={styles.body}>
          <View style={styles.head}>
            <ThemedText type="edge" themeColor="amber">
              CUT {cut.no} · {cut.clip.durationSec}초 · {OrientationLabels[cut.clip.orientation]}{' '}
              원본
              {cut.clip.mood ? ` · ${getCaptureMoodLabel(cut.clip.mood)}` : ''}
            </ThemedText>
            <ThemedText type="heading">{formatRecordingDate(cut.clip.capturedAt)}</ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="edge" themeColor="textSecondary">
              이 컷이 든 롤 {cut.rolls.length}
            </ThemedText>

            {cut.rolls.length === 0 ? (
              <View style={[styles.emptyRolls, { borderColor: theme.border }]}>
                <ThemedText type="smallBold">아직 어느 롤에도 없어요</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  롤에 담아야 현상할 수 있어요.
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={styles.rollList} contentContainerStyle={styles.rollListContent}>
                {cut.rolls.map((roll) => (
                  <View
                    key={roll.rollId}
                    style={[styles.rollRow, { borderColor: theme.border }]}
                  >
                    <View style={[styles.tint, { backgroundColor: roll.tint }]} />
                    <View style={styles.rollText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {roll.title}
                      </ThemedText>
                      <ThemedText type="edge" themeColor="textSecondary">
                        {roll.isToday ? '오늘의 롤 · ' : ''}
                        {RollStatusLabels[roll.status]}
                        {roll.canEditMembership ? '' : ' · 멤버십 고정'}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.actions}>
            <SnaplyButton
              title="재생"
              icon="▶"
              disabled={!hasFile || isDeleting}
              onPress={onPlay}
            />
            {hasFile ? null : (
              <ThemedText type="small" themeColor="danger" style={styles.centerText}>
                원본을 찾을 수 없어요. 파일이 이미 지워졌어요.
              </ThemedText>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이 컷을 보관함에서 삭제"
              accessibilityState={{ disabled: isDeleting }}
              disabled={isDeleting}
              onPress={onDelete}
              style={styles.deleteAction}
            >
              <ThemedText type="smallBold" themeColor="danger">
                보관함에서 삭제
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.five },
  head: { gap: Spacing.one },
  section: { gap: Spacing.two },
  // Bounded so a cut in many rolls scrolls inside the sheet.
  rollList: { maxHeight: 220 },
  rollListContent: { gap: Spacing.two },
  rollRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  tint: { width: 10, height: 10, borderRadius: 5 },
  rollText: { flex: 1, gap: 2 },
  emptyRolls: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.one,
    alignItems: 'center',
  },
  actions: { gap: Spacing.three },
  centerText: { textAlign: 'center' },
  deleteAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
