import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { Cut } from '../model/use-movie-cuts';

export type CutInspectorProps = {
  cut: Cut;
  index: number;
  count: number;
  /** False while a job owns the movie — the row becomes a read-out. */
  canEdit: boolean;
  /** False for the last remaining cut: a movie must keep at least one. */
  canRemove: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onResetTrim: (index: number) => void;
};

/**
 * The selected cut's controls: where it sits, and the way out.
 *
 * One inspector for whichever cut the strip has picked, instead of one row of
 * controls per cut. The cut's *length* is not set here — the trim handles live
 * on the selected clip in the timeline itself — the inspector reads the result
 * out and offers `전체 사용` to drop a trim. Order is changed with ◀ ▶ rather
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
  onMove,
  onRemove,
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
        <Ionicons
          name={direction === -1 ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={theme.text}
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.inspector}>
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
        {canEdit && isTrimmed && cut.snap ? (
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
            <Ionicons name="close" size={18} color={canRemove ? theme.danger : theme.textSecondary} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inspector: {
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
});
