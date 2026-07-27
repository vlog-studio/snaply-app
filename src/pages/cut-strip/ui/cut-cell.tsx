import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  formatRecordingDate,
  formatRecordingTime,
  useRecordingThumbnail,
} from '@/features/manage-recordings';
import type { LocalRecording } from '@/shared/lib/recording-files';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CutCellProps = {
  recording: LocalRecording;
  clipNo: string;
  selectionMode: boolean;
  selected: boolean;
  isDeleting: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function CutCellComponent({
  recording,
  clipNo,
  selectionMode,
  selected,
  isDeleting,
  onPress,
  onLongPress,
}: CutCellProps) {
  const theme = useTheme();
  const thumbnailUri = useRecordingThumbnail(recording);

  return (
    <Pressable
      accessibilityHint={selectionMode ? '선택을 켜거나 꺼요' : '담긴 원본 컷을 재생해요'}
      accessibilityLabel={`${formatRecordingDate(recording.createdAt)} 컷`}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={{ checked: selectionMode ? selected : undefined }}
      disabled={isDeleting}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={260}
      style={[
        styles.cell,
        { backgroundColor: theme.film, borderColor: selected ? theme.primary : theme.border },
        selected && styles.cellSelected,
        isDeleting && styles.cellDeleting,
      ]}
    >
      {thumbnailUri ? (
        <Image
          contentFit="cover"
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          transition={160}
        />
      ) : (
        <View style={styles.placeholder}>
          <ThemedText selectable={false} style={[styles.placeholderPlay, { color: theme.text }]}>
            ▶
          </ThemedText>
        </View>
      )}

      {/* Clip number badge — kept for continuity with the film-cell language. */}
      <View style={styles.numberBadge}>
        <ThemedText selectable={false} style={[styles.numberText, { color: theme.amber }]}>
          {clipNo}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <ThemedText selectable={false} style={styles.footerText}>
          {formatRecordingTime(recording.createdAt)}
        </ThemedText>
      </View>

      {selectionMode ? (
        <View
          style={[
            styles.check,
            selected
              ? { backgroundColor: theme.primary, borderColor: theme.primary }
              : { backgroundColor: 'rgba(14,11,8,0.5)', borderColor: 'rgba(255,255,255,0.85)' },
          ]}
        >
          {selected ? (
            <ThemedText selectable={false} style={[styles.checkMark, { color: theme.onPrimary }]}>
              ✓
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const CutCell = memo(CutCellComponent);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    flexBasis: '31%',
    maxWidth: '33%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cellSelected: { borderWidth: 2 },
  cellDeleting: { opacity: 0.4 },
  placeholder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderPlay: { fontSize: 22 },
  numberBadge: { alignSelf: 'flex-end', paddingHorizontal: Spacing.two, paddingTop: Spacing.one },
  numberText: { fontSize: 9, letterSpacing: 0.5, fontWeight: '700' },
  footer: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    backgroundColor: 'rgba(14,11,8,0.5)',
  },
  footerText: { color: '#F1E6DA', fontSize: 10, letterSpacing: 0.4, fontWeight: '700' },
  check: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', lineHeight: 15 },
});
