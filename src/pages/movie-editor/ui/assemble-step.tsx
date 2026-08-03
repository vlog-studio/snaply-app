import { Pressable, StyleSheet, View } from 'react-native';

import { MovieSnapLimit } from '@/entities/movie';
import type { CutsRefusal } from '@/features/compose-movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { Cut } from '../model/use-movie-editor';
import { CutRow } from './cut-row';

export type AssembleStepProps = {
  cuts: Cut[];
  totalSec: number;
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
  frozen: '생성이 시작된 무비는 컷을 고칠 수 없어요.',
};

/**
 * Step ① — the cut list: order, length, and membership (concept §6).
 *
 * The order and lengths decided here are kept exactly as they are; generation only
 * handles transitions, grading, and music. That is the rule the whole editor exists
 * for, so the screen says it out loud.
 */
export function AssembleStep({
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
}: AssembleStepProps) {
  const theme = useTheme();
  const room = Math.max(MovieSnapLimit - cuts.length, 0);

  return (
    <View style={styles.step}>
      <View style={styles.sectionHead}>
        <ThemedText type="smallBold">컷 순서와 길이</ThemedText>
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
        여기서 정한 순서와 길이는 그대로 유지돼요. AI는 전환·색보정·음악만 맡습니다.
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
