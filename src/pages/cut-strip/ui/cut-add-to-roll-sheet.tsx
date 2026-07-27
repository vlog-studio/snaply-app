import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { CollectTarget } from '@/features/collect-clips';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CutAddToRollSheetProps = {
  visible: boolean;
  /** How many cuts are on their way in — printed in the heading. */
  cutCount: number;
  targets: CollectTarget[];
  onSelect: (rollId: string) => void;
  /** Leaves for the new-roll sheet when none of the listed rolls is the one. */
  onBundleIntoNewRoll: () => void;
  onClose: () => void;
};

/**
 * Picks the roll the selected cuts go into.
 *
 * Only undeveloped rolls are listed, today's first: a developed roll's reel is
 * finished, so offering it would only lead to a refusal. A roll that already
 * holds every selected cut stays visible but inert — "already in there" is an
 * answer, and hiding the roll would read as it having disappeared.
 *
 * Distinct from the roll picker that narrows the strip: that one chooses what
 * to look at and lists rolls that hold something, this one chooses where to
 * write and an empty roll is a perfectly good target.
 *
 * 새 롤로 묶기 sits under the list because early on the list is only today's
 * roll, and "none of these" would otherwise be a dead end.
 */
export function CutAddToRollSheet({
  visible,
  cutCount,
  targets,
  onSelect,
  onBundleIntoNewRoll,
  onClose,
}: CutAddToRollSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="롤에 담기">
      <View style={styles.head}>
        <ThemedText type="heading">롤에 담기</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {cutCount}컷을 담을 롤을 고르세요. 원본은 보관함에 그대로 남아요.
        </ThemedText>
      </View>

      {targets.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">담을 수 있는 롤이 없어요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            현상을 마친 롤은 멤버십이 고정이라 담을 수 없어요.
          </ThemedText>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {targets.map((target) => (
            <Pressable
              key={target.rollId}
              accessibilityRole="button"
              accessibilityLabel={`${target.title}에 담기`}
              accessibilityState={{ disabled: target.holdsAll }}
              disabled={target.holdsAll}
              onPress={() => onSelect(target.rollId)}
              style={[
                styles.row,
                { borderColor: theme.border, opacity: target.holdsAll ? 0.5 : 1 },
              ]}
            >
              <View style={[styles.tint, { backgroundColor: target.tint }]} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {target.title}
                </ThemedText>
                <ThemedText type="edge" themeColor="textSecondary">
                  {target.isToday ? '오늘의 롤 · ' : ''}
                  {target.cutCount}컷
                  {target.heldCount > 0 && !target.holdsAll
                    ? ` · 이미 ${target.heldCount}컷 있음`
                    : ''}
                </ThemedText>
              </View>
              <ThemedText
                selectable={false}
                type="edge"
                themeColor={target.holdsAll ? 'textSecondary' : 'primary'}
              >
                {target.holdsAll ? '이미 담김' : '담기'}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${cutCount}컷을 새 롤로 묶기`}
        onPress={onBundleIntoNewRoll}
        style={[styles.newRoll, { borderColor: theme.border }]}
      >
        <ThemedText selectable={false} type="smallBold" themeColor="primary">
          + 새 롤로 묶기
        </ThemedText>
        <ThemedText selectable={false} type="edge" themeColor="textSecondary">
          이 {cutCount}컷만의 롤을 만들어요
        </ThemedText>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one, paddingBottom: Spacing.four },
  // Bounded so a long roll list scrolls inside the sheet instead of pushing it
  // past the top of the screen.
  list: { maxHeight: 320 },
  listContent: { gap: Spacing.two },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  tint: { width: 10, height: 10, borderRadius: 5 },
  newRoll: {
    minHeight: 56,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: Spacing.two,
  },
  rowText: { flex: 1, gap: 2 },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.one,
    alignItems: 'center',
  },
  centerText: { textAlign: 'center' },
});
