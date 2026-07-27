import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { CutRollFilterOption } from '../model/use-cut-strip';

type CutRollPickerSheetProps = {
  visible: boolean;
  rolls: CutRollFilterOption[];
  selectedRollId: string | undefined;
  onSelect: (rollId: string) => void;
  onClose: () => void;
};

/** Picks the one roll the strip narrows to. Read-only: it filters, nothing more. */
export function CutRollPickerSheet({
  visible,
  rolls,
  selectedRollId,
  onSelect,
  onClose,
}: CutRollPickerSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="롤별로 보기">
      <View style={styles.head}>
        <ThemedText type="heading">롤별로 보기</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          컷을 담고 있는 롤만 보여요.
        </ThemedText>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {rolls.map((roll) => {
          const isSelected = roll.rollId === selectedRollId;
          return (
            <Pressable
              key={roll.rollId}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(roll.rollId)}
              style={[
                styles.row,
                {
                  borderColor: isSelected ? theme.primary : theme.border,
                  backgroundColor: isSelected ? theme.backgroundSelected : 'transparent',
                },
              ]}
            >
              <View style={[styles.tint, { backgroundColor: roll.tint }]} />
              <View style={styles.rowText}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {roll.title}
                </ThemedText>
                <ThemedText type="edge" themeColor="textSecondary">
                  {roll.isToday ? '오늘의 롤 · ' : ''}
                  {roll.cutCount}컷
                </ThemedText>
              </View>
              {isSelected ? (
                <ThemedText selectable={false} type="edge" themeColor="primary">
                  선택됨
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
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
  rowText: { flex: 1, gap: 2 },
});
