import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type MovieSelectionBarProps = {
  selectedCount: number;
  /**
   * Whether the one selected movie has no rendered file to share. Read only
   * while exactly one movie is selected — the 공유 action exists only then, and
   * only when a file exists to hand over, same rule as the movie screen.
   */
  shareBlocked: boolean;
  onShare: () => void;
  onDelete: () => void;
  onClear: () => void;
};

/**
 * The movie grid's selection-mode bottom bar: how many movies are picked and
 * what can be done with them, standing where the tab bar stood.
 *
 * Deletion is the act that works on any number, so it is the bar's primary
 * button. Share only means anything for a single movie with a rendered file —
 * it appears exactly then and steps aside otherwise, rather than sitting
 * disabled with nothing to say. Rename is not here at all: it belongs to the
 * movie screen, where the title is on display while it is edited.
 */
export function MovieSelectionBar({
  selectedCount,
  shareBlocked,
  onShare,
  onDelete,
  onClear,
}: MovieSelectionBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const single = selectedCount === 1;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + Spacing.four,
        },
      ]}
    >
      <View style={styles.counts}>
        <ThemedText type="smallBold">{selectedCount}편 선택</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="선택 해제"
          accessibilityState={{ disabled: selectedCount === 0 }}
          disabled={selectedCount === 0}
          hitSlop={8}
          onPress={onClear}
          style={styles.textAction}
        >
          <ThemedText selectable={false} type="smallBold" themeColor="textSecondary">
            해제
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.actions}>
        {single && !shareBlocked ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="공유"
            hitSlop={8}
            onPress={onShare}
            style={styles.textAction}
          >
            <ThemedText selectable={false} type="smallBold">
              공유
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${selectedCount}편 무비 삭제`}
          accessibilityState={{ disabled: selectedCount === 0 }}
          disabled={selectedCount === 0}
          onPress={onDelete}
          style={({ pressed }) => [
            styles.primaryAction,
            {
              backgroundColor: theme.danger,
              opacity: selectedCount > 0 ? (pressed ? 0.78 : 1) : 0.45,
            },
          ]}
        >
          <ThemedText selectable={false} type="button" style={{ color: theme.onPrimary }}>
            삭제
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  textAction: { minHeight: 44, justifyContent: 'center' },
  primaryAction: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
