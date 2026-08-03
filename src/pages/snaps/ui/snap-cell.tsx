import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Snap } from '@/entities/snap';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

export type SnapCellProps = {
  snap: Snap;
  /** Cell width in points; the 9:16 height is derived from it. */
  width: number;
  /** Selection order, 1-based. Undefined when not selected. */
  pickNumber?: number;
  /** Whether the grid is in selection mode — a tap picks instead of plays. */
  selecting: boolean;
  /** Whether this snap is already sitting in the tray. */
  inTray: boolean;
  onPress: (snap: Snap) => void;
  onLongPress: (snap: Snap) => void;
};

/**
 * One snap in the grid: its first frame, its length, and — depending on the
 * mode — either a "담김" badge or its pick number.
 *
 * Memoized because selecting one snap re-renders the whole library; without it
 * every cell would re-run its thumbnail lookup on every tap.
 */
export const SnapCell = memo(function SnapCell({
  snap,
  width,
  pickNumber,
  selecting,
  inTray,
  onPress,
  onLongPress,
}: SnapCellProps) {
  const theme = useTheme();
  const isPicked = pickNumber !== undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selecting ? { selected: isPicked } : undefined}
      accessibilityLabel={`${snap.durationSec}초 스냅${inTray && !selecting ? ' · 트레이에 담김' : ''}`}
      accessibilityHint={selecting ? '탭하면 선택해요' : '탭하면 재생해요. 길게 누르면 선택해요'}
      onPress={() => onPress(snap)}
      onLongPress={() => onLongPress(snap)}
      style={[
        styles.cell,
        {
          width,
          height: Math.round((width * 16) / 9),
          borderColor: isPicked ? theme.primary : theme.border,
        },
        isPicked && styles.picked,
      ]}
    >
      <VideoFrame uri={snap.uri} />
      {selecting ? (
        <View
          style={[
            styles.pick,
            {
              backgroundColor: isPicked ? theme.primary : 'rgba(0,0,0,0.45)',
              borderColor: isPicked ? theme.primary : 'rgba(255,255,255,0.7)',
            },
          ]}
        >
          {isPicked ? (
            <ThemedText selectable={false} type="smallBold" style={{ color: theme.onPrimary }}>
              {pickNumber}
            </ThemedText>
          ) : null}
        </View>
      ) : inTray ? (
        <View style={[styles.trayBadge, { backgroundColor: theme.primary }]}>
          <ThemedText selectable={false} type="edge" style={{ color: theme.onPrimary }}>
            담김
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.duration}>
        <ThemedText selectable={false} type="edge" style={styles.durationText}>
          {snap.durationSec}s
        </ThemedText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // A 9:16 cell whose width and height are both given in points by the caller.
  // Sized rather than shaped with `aspectRatio` on purpose: a wrapped flex cell
  // whose only children are absolutely positioned collapses to zero height when
  // its size comes from a percentage width plus an aspect ratio. `overflow:
  // hidden` clips the absolutely-filled frame to the rounded corners.
  cell: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  picked: { borderWidth: 2 },
  pick: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trayBadge: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  duration: {
    position: 'absolute',
    bottom: Spacing.one,
    right: Spacing.one,
    borderRadius: Radius.small,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.one,
    paddingVertical: 1,
  },
  // Drawn over arbitrary video, so plain white rather than a palette color.
  durationText: { color: '#FFFFFF' },
});
