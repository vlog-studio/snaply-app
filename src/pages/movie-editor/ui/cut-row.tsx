import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

import type { Cut } from '../model/use-movie-editor';

export type CutRowProps = {
  cut: Cut;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  /** False once a generation job owns the movie — the row becomes read-only. */
  canEdit: boolean;
  /** False for the last remaining cut: a movie must keep at least one. */
  canRemove: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
};

const ThumbWidth = 44;

/**
 * One cut of the assemble step: its frame, its position and length, and the
 * controls that move or drop it.
 *
 * Order is changed with ▲▼ rather than by dragging. Two buttons are reachable
 * one-handed, work with assistive touch, and need no gesture arbitration inside
 * a scroll view; a drag grid is the richer interaction and can replace this
 * later without changing what it commits.
 */
export function CutRow({
  cut,
  index,
  isFirst,
  isLast,
  canEdit,
  canRemove,
  onMove,
  onRemove,
}: CutRowProps) {
  const theme = useTheme();
  const number = index + 1;
  const missing = cut.snap === undefined;

  return (
    <View
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <View style={[styles.thumb, { borderColor: theme.border }]}>
        {cut.snap ? <VideoFrame uri={cut.snap.uri} /> : null}
      </View>

      <View style={styles.meta}>
        <ThemedText type="smallBold">컷 {number}</ThemedText>
        <ThemedText type="small" themeColor={missing ? 'danger' : 'textSecondary'}>
          {missing ? '원본이 삭제됐어요 · 빼주세요' : `${cut.snap?.durationSec}초`}
        </ThemedText>
      </View>

      {canEdit ? (
        <>
          <View style={styles.arrows}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`컷 ${number} 위로`}
              accessibilityState={{ disabled: isFirst }}
              disabled={isFirst}
              onPress={() => onMove(index, -1)}
              style={[styles.arrow, { borderColor: theme.border, opacity: isFirst ? 0.35 : 1 }]}
            >
              <ThemedText selectable={false} type="smallBold">
                ▲
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`컷 ${number} 아래로`}
              accessibilityState={{ disabled: isLast }}
              disabled={isLast}
              onPress={() => onMove(index, 1)}
              style={[styles.arrow, { borderColor: theme.border, opacity: isLast ? 0.35 : 1 }]}
            >
              <ThemedText selectable={false} type="smallBold">
                ▼
              </ThemedText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`컷 ${number} 빼기`}
            accessibilityState={{ disabled: !canRemove }}
            disabled={!canRemove}
            hitSlop={6}
            onPress={() => onRemove(index)}
            style={styles.remove}
          >
            <ThemedText
              selectable={false}
              type="smallBold"
              style={{ color: canRemove ? theme.danger : theme.textSecondary }}
            >
              ✕
            </ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.two,
  },
  thumb: {
    width: ThumbWidth,
    height: Math.round((ThumbWidth * 16) / 9),
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  meta: { flex: 1, gap: Spacing.half },
  arrows: { gap: Spacing.half },
  arrow: {
    width: 34,
    height: 30,
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: { minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
