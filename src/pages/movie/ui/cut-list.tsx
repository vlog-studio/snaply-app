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
  /** False while a job owns the movie; the rows become a read-out. */
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
  frozen: '만드는 동안에는 컷을 고칠 수 없어요.',
};

/**
 * The cut list: order, length, and membership.
 *
 * The same rows settle a draft before its first run and fix a result after one;
 * what they commit is what the next generation is built from. Only while a job
 * owns the movie do they become a read-out — editing under a run would make the
 * result describe a cut list that no longer exists.
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
          ? '고친 순서와 길이는 그대로 유지돼요. 만들 때 이 구성 그대로 만들어집니다.'
          : '만드는 동안에는 컷을 고칠 수 없어요. 끝나면 다시 고칠 수 있습니다.'}
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
