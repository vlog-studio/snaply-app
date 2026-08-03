import { Pressable, StyleSheet, View } from 'react-native';

import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

import type { Cut } from '../model/use-movie-cuts';
import { TrimBar } from './trim-bar';

export type CutRowProps = {
  cut: Cut;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  /** False once a generation job owns the movie — the row becomes read-only. */
  canEdit: boolean;
  /** False for the last remaining cut: a movie must keep at least one. */
  canRemove: boolean;
  /** Width of the trim track, derived by the page from the content column. */
  trimWidth: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onTrim: (index: number, startSec: number, endSec: number) => void;
  onResetTrim: (index: number) => void;
};

const ThumbWidth = 44;

/**
 * One cut of the cut list: its frame, its position and length, the trim bar
 * that sets how much of it plays, and the controls that move or drop it.
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
  trimWidth,
  onMove,
  onRemove,
  onTrim,
  onResetTrim,
}: CutRowProps) {
  const theme = useTheme();
  const number = index + 1;
  const missing = cut.snap === undefined;
  const isTrimmed = cut.ref.trim !== undefined;

  return (
    <View
      style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <View style={styles.top}>
        <View style={[styles.thumb, { borderColor: theme.border }]}>
          {cut.snap ? <VideoFrame uri={cut.snap.uri} /> : null}
        </View>

        <View style={styles.meta}>
          <ThemedText type="smallBold">컷 {number}</ThemedText>
          <ThemedText type="small" themeColor={missing ? 'danger' : 'textSecondary'}>
            {missing
              ? '원본이 삭제됐어요 · 빼주세요'
              : isTrimmed
                ? `원본 ${formatSeconds(cut.snap!.durationSec)} → 사용 ${formatSeconds(cut.usedSec)}`
                : formatSeconds(cut.usedSec)}
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

      {/* A cut with no original left has nothing to trim, and a read-only movie
          keeps the bar drawn but inert (`canEdit`) rather than swapping the row
          for a different tree. */}
      {cut.snap ? (
        <View style={styles.trim}>
          <TrimBar
            durationSec={cut.snap.durationSec}
            startSec={cut.ref.trim?.startSec ?? 0}
            endSec={cut.ref.trim?.endSec ?? cut.snap.durationSec}
            width={trimWidth}
            canEdit={canEdit}
            onChange={(startSec, endSec) => onTrim(index, startSec, endSec)}
          />
          {canEdit && isTrimmed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`컷 ${number} 전체 사용`}
              hitSlop={6}
              onPress={() => onResetTrim(index)}
            >
              <ThemedText selectable={false} type="edge" themeColor="primary">
                전체 사용
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.two,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
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
  trim: { gap: Spacing.one, alignItems: 'flex-start' },
});
