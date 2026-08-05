import { Pressable, StyleSheet, View } from 'react-native';

import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { Cut } from '../model/use-movie-cuts';
import { TrimBar } from './trim-bar';

export type CutInspectorProps = {
  cut: Cut;
  index: number;
  count: number;
  /** False while a job owns the movie — the row becomes a read-out. */
  canEdit: boolean;
  /** False for the last remaining cut: a movie must keep at least one. */
  canRemove: boolean;
  /** Width of the trim track, derived by the page rather than measured. */
  trimWidth: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onTrim: (index: number, startSec: number, endSec: number) => void;
  onResetTrim: (index: number) => void;
};

/**
 * The selected cut's controls: where it sits, how long it plays, and the way
 * out.
 *
 * One inspector for whichever cut the strip has picked, instead of one row of
 * controls per cut — the timeline layout gets its vertical room back and the
 * trim bar can run the full content width. Order is changed with ◀ ▶ rather
 * than by dragging: two buttons are reachable one-handed, work with assistive
 * touch, and need no gesture arbitration; a drag strip can replace them later
 * without changing what is committed.
 */
export function CutInspector({
  cut,
  index,
  count,
  canEdit,
  canRemove,
  trimWidth,
  onMove,
  onRemove,
  onTrim,
  onResetTrim,
}: CutInspectorProps) {
  const theme = useTheme();
  const number = index + 1;
  const missing = cut.snap === undefined;
  const isTrimmed = cut.ref.trim !== undefined;
  const isFirst = index === 0;
  const isLast = index === count - 1;

  const moveButton = (direction: -1 | 1) => {
    const disabled = direction === -1 ? isFirst : isLast;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`컷 ${number} ${direction === -1 ? '앞으로' : '뒤로'}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onMove(index, direction)}
        style={[styles.tool, { borderColor: theme.border, opacity: disabled ? 0.35 : 1 }]}
      >
        <ThemedText selectable={false} type="smallBold">
          {direction === -1 ? '◀' : '▶'}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={styles.inspector}>
      <View style={styles.head}>
        <View style={styles.meta}>
          <ThemedText type="smallBold">
            컷 {number} / {count}
          </ThemedText>
          <ThemedText type="small" themeColor={missing ? 'danger' : 'textSecondary'}>
            {missing
              ? '원본이 삭제됐어요 · 빼주세요'
              : isTrimmed
                ? `원본 ${formatSeconds(cut.snap!.durationSec)} → 사용 ${formatSeconds(cut.usedSec)}`
                : `사용 ${formatSeconds(cut.usedSec)}`}
          </ThemedText>
        </View>

        {canEdit ? (
          <View style={styles.tools}>
            {moveButton(-1)}
            {moveButton(1)}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`컷 ${number} 빼기`}
              accessibilityState={{ disabled: !canRemove }}
              disabled={!canRemove}
              onPress={() => onRemove(index)}
              style={[styles.tool, { borderColor: theme.border }]}
            >
              <ThemedText
                selectable={false}
                type="smallBold"
                style={{ color: canRemove ? theme.danger : theme.textSecondary }}
              >
                ✕
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* A cut with no original left has nothing to trim; a read-only movie
          keeps the bar drawn but inert (`canEdit`) rather than swapping trees. */}
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
  inspector: { gap: Spacing.two },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  meta: { flex: 1, gap: Spacing.half },
  tools: { flexDirection: 'row', gap: Spacing.one },
  tool: {
    minWidth: 44,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trim: { gap: Spacing.one, alignItems: 'flex-start' },
});
