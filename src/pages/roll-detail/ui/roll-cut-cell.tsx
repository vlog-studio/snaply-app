import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getCaptureMoodLabel } from '@/entities/capture-session';
import type { Clip } from '@/entities/clip';
import { NegativeFrame } from '@/shared/ui/negative-frame';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type RollGridMode = 'view' | 'select' | 'reorder';

type RollCutCellProps = {
  clip: Clip;
  /** Zero-based current position of the cut inside the roll. */
  index: number;
  mode: RollGridMode;
  /** Whether this cut is selected (select mode only). */
  selected: boolean;
  /** Zero-based new position assigned so far (reorder mode only). */
  sequenceNo: number | undefined;
  /** Whether long-press may enter selection mode (undeveloped rolls only). */
  canEdit: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

function describeCut(clip: Clip, index: number): string {
  const mood = clip.mood ? ` · ${getCaptureMoodLabel(clip.mood)}` : '';
  return `${index + 1}번째 컷 · ${clip.durationSec}초${mood}`;
}

function RollCutCellComponent({
  clip,
  index,
  mode,
  selected,
  sequenceNo,
  canEdit,
  onPress,
  onLongPress,
}: RollCutCellProps) {
  const theme = useTheme();

  const accessibilityHint =
    mode === 'view'
      ? '컷 원본을 재생해요'
      : mode === 'select'
        ? '선택을 켜거나 꺼요'
        : '탭한 순서대로 새 번호를 매겨요';

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={describeCut(clip, index)}
      accessibilityRole={mode === 'select' ? 'checkbox' : 'button'}
      accessibilityState={{ checked: mode === 'select' ? selected : undefined }}
      onPress={onPress}
      onLongPress={canEdit && mode === 'view' ? onLongPress : undefined}
      delayLongPress={260}
      style={[
        styles.frameCell,
        { backgroundColor: theme.film, borderColor: selected ? theme.primary : theme.border },
        selected && styles.frameSelected,
      ]}
    >
      {/* In-flow sizing anchor — see the `frameFill` style note. Without a
        flex child a percentage-width + aspectRatio cell doesn't take its
        aspectRatio height in the wrapping grid, so it collapses. Every
        other child here (the negative, the two edge labels) is absolutely
        positioned and can't serve as that anchor. */}
      <View style={styles.frameFill} />
      <NegativeFrame uri={clip.uri} />
      <ThemedText type="edge" themeColor="amber" style={styles.frameIndex}>
        {String(index + 1).padStart(2, '0')}
      </ThemedText>
      <ThemedText type="edge" themeColor="textSecondary" style={styles.frameMeta}>
        {clip.durationSec}s
      </ThemedText>

      {mode === 'select' ? (
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

      {mode === 'reorder' ? (
        <View style={styles.sequenceOverlay}>
          <View
            style={[
              styles.sequenceBadge,
              sequenceNo !== undefined
                ? { backgroundColor: theme.primary, borderColor: theme.primary }
                : { backgroundColor: 'rgba(14,11,8,0.5)', borderColor: 'rgba(255,255,255,0.85)' },
            ]}
          >
            {sequenceNo !== undefined ? (
              <ThemedText
                selectable={false}
                type="smallBold"
                style={{ color: theme.onPrimary }}
              >
                {sequenceNo + 1}
              </ThemedText>
            ) : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export const RollCutCell = memo(RollCutCellComponent);

const styles = StyleSheet.create({
  // In-flow anchor: a `flex: 1` child is what makes the percentage-width +
  // aspectRatio cell actually take its aspectRatio height in the wrapping grid.
  frameFill: { flex: 1 },
  // One standardized contact-sheet cell (shared geometry with the page's empty
  // slots): the thumbnail fills exactly this cell (NegativeFrame is an absolute
  // fill, clipped by `overflow: 'hidden'`).
  frameCell: {
    width: '30%',
    aspectRatio: 0.72,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  frameSelected: { borderWidth: 2 },
  // Edge index and duration float in opposite corners so neither displaces the
  // negative fill.
  frameIndex: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  frameMeta: { position: 'absolute', bottom: Spacing.two, right: Spacing.two },
  check: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', lineHeight: 15 },
  sequenceOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  sequenceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
