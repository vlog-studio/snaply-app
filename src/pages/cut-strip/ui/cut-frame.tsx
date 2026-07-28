import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateTime } from '@/shared/lib/datetime';
import { useVideoThumbnail } from '@/shared/lib/video-thumbnails';
import { Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { StripCut } from '../model/use-cut-strip';

/** Frame geometry, in points. The strip computes its perforation from these. */
export const CutFrameWidth = 58;
const CutFrameHeight = 78;
// A film frame's corners are all but square — the design system's smallest
// radius (12) would round a 58pt frame into a tile again.
const FrameRadius = 4;

/** Past this many rolls the dots stop being readable and collapse into +N. */
const MaxDots = 3;

type CutFrameProps = {
  cut: StripCut;
  selectionMode: boolean;
  selected: boolean;
  isDeleting: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/**
 * One frame of the contact strip.
 *
 * The colored dots along its bottom edge are the roll membership made visible:
 * one dot per roll holding this cut, in that roll's own tint, so a cut living in
 * two rolls reads as two dots without opening anything (concept §3, N:M). A cut
 * no roll holds gets an amber dashed edge instead — nothing is keeping it.
 */
function CutFrameComponent({
  cut,
  selectionMode,
  selected,
  isDeleting,
  onPress,
  onLongPress,
}: CutFrameProps) {
  const theme = useTheme();
  const thumbnailUri = useVideoThumbnail(cut.clip.uri);
  const isLoose = cut.rolls.length === 0;
  const dots = cut.rolls.slice(0, MaxDots);
  const hiddenDotCount = cut.rolls.length - dots.length;

  return (
    <Pressable
      accessibilityHint={selectionMode ? '선택을 켜거나 꺼요' : '컷 정보를 열어요'}
      accessibilityLabel={`${formatDateTime(cut.clip.capturedAt)} 컷 · ${
        isLoose ? '롤 없음' : `롤 ${cut.rolls.length}개`
      }`}
      accessibilityRole={selectionMode ? 'checkbox' : 'button'}
      accessibilityState={{ checked: selectionMode ? selected : undefined }}
      disabled={isDeleting}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={260}
      style={[
        styles.frame,
        {
          backgroundColor: theme.film,
          borderColor: selected ? theme.primary : isLoose ? theme.amber : theme.border,
        },
        isLoose && !selected && styles.frameLoose,
        selected && styles.frameSelected,
        isDeleting && styles.frameDeleting,
      ]}
    >
      {thumbnailUri ? (
        <Image
          accessible={false}
          contentFit="cover"
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          transition={160}
        />
      ) : null}

      <ThemedText selectable={false} style={[styles.edgeNo, { color: theme.amber }]}>
        {cut.no}
      </ThemedText>

      {cut.rolls.length > 0 ? (
        <View style={styles.dotRow}>
          {dots.map((roll) => (
            <View key={roll.rollId} style={[styles.dot, { backgroundColor: roll.tint }]} />
          ))}
          {hiddenDotCount > 0 ? (
            <ThemedText selectable={false} style={styles.dotOverflow}>
              +{hiddenDotCount}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

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

export const CutFrame = memo(CutFrameComponent);

/** An unfilled frame on today's strip — a moment not kept yet, not a gap. */
export function CutFrameSlot() {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel="빈 프레임"
      style={[styles.frame, styles.frameEmpty, { borderColor: theme.border }]}
    >
      <View style={styles.slotFill}>
        <ThemedText selectable={false} style={[styles.slotGhost, { color: theme.border }]}>
          ?
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: CutFrameWidth,
    height: CutFrameHeight,
    borderRadius: FrameRadius,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  frameLoose: { borderStyle: 'dashed' },
  frameSelected: { borderWidth: 2 },
  frameDeleting: { opacity: 0.4 },
  frameEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  // The percentage-height + border cell needs an in-flow child to center on.
  slotFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slotGhost: { fontSize: 16, fontWeight: '700' },
  edgeNo: {
    alignSelf: 'flex-end',
    paddingHorizontal: 3,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 0.4,
    fontWeight: '700',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 3,
    backgroundColor: 'rgba(14,11,8,0.62)',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOverflow: { color: '#F1E6DA', fontSize: 8, lineHeight: 10, fontWeight: '800' },
  check: {
    position: 'absolute',
    top: Spacing.half,
    left: Spacing.half,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 11, fontWeight: '800', lineHeight: 13 },
});
