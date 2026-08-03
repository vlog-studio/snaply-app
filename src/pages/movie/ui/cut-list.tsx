import { Pressable, StyleSheet, View } from 'react-native';

import { MovieSnapLimit } from '@/entities/movie';
import type { CutsRefusal } from '@/features/compose-movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { Cut } from '../model/use-movie-cuts';
import { CutRow } from './cut-row';

export type CutListProps = {
  cuts: Cut[];
  totalSec: number;
  /** False until the movie has been generated; the rows become a read-out. */
  canEdit: boolean;
  refusal: CutsRefusal | undefined;
  /** Width of each row's trim track, derived by the page. */
  trimWidth: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
  onTrim: (index: number, startSec: number, endSec: number) => void;
  onResetTrim: (index: number) => void;
  onAddSnaps: () => void;
};

const RefusalMessages: Record<CutsRefusal, string> = {
  empty: '컷이 최소 1개는 있어야 해요.',
  full: `한 편에는 스냅 ${MovieSnapLimit}개까지 들어가요.`,
  frozen: '완성된 뒤에 컷을 고칠 수 있어요.',
};

/**
 * The cut list: order, length, and membership.
 *
 * Read-only until the movie has been generated — before that there is nothing to
 * react to, so the list is a preview of what is about to be made. Once a result
 * exists the same rows become the controls for fixing it, and what they commit
 * is what the next generation is built from.
 */
export function CutList({
  cuts,
  totalSec,
  canEdit,
  refusal,
  trimWidth,
  onMove,
  onRemove,
  onTrim,
  onResetTrim,
  onAddSnaps,
}: CutListProps) {
  const theme = useTheme();
  const room = Math.max(MovieSnapLimit - cuts.length, 0);

  return (
    <View style={styles.step}>
      <View style={styles.sectionHead}>
        <ThemedText type="smallBold">{canEdit ? '컷 순서와 길이' : '들어간 컷'}</ThemedText>
        <ThemedText type="edge" themeColor="textSecondary">
          {cuts.length} / {MovieSnapLimit} · {formatSeconds(totalSec)}
        </ThemedText>
      </View>

      <View style={styles.cuts}>
        {cuts.map((cut, index) => (
          <CutRow
            key={cut.ref.snapId}
            cut={cut}
            index={index}
            isFirst={index === 0}
            isLast={index === cuts.length - 1}
            canEdit={canEdit}
            canRemove={cuts.length > 1}
            trimWidth={trimWidth}
            onMove={onMove}
            onRemove={onRemove}
            onTrim={onTrim}
            onResetTrim={onResetTrim}
          />
        ))}
      </View>

      {refusal ? (
        <View
          style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}
        >
          <ThemedText type="small">{RefusalMessages[refusal]}</ThemedText>
        </View>
      ) : null}

      {canEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="스냅 더 넣기"
          accessibilityState={{ disabled: room === 0 }}
          disabled={room === 0}
          onPress={onAddSnaps}
          style={[styles.addCut, { borderColor: theme.border, opacity: room === 0 ? 0.45 : 1 }]}
        >
          <ThemedText selectable={false} type="smallBold" themeColor="primary">
            + 스냅 더 넣기{room > 0 ? ` (${room}개 더)` : ''}
          </ThemedText>
        </Pressable>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        {canEdit
          ? '고친 순서와 길이는 그대로 유지돼요. 다시 만들면 이 구성 그대로 만들어집니다.'
          : '컷을 고치는 건 완성된 뒤부터예요. 지금은 이 순서 그대로 만들어집니다.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  sectionHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cuts: { gap: Spacing.two },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  addCut: {
    minHeight: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
