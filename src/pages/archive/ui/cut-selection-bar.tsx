import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CutSelectionBarProps = {
  selectedCount: number;
  allSelected: boolean;
  onCancel: () => void;
  onToggleSelectAll: () => void;
  onDelete: () => void;
};

// Content height of the selection action bar. Taller than the tab bar's 40 so
// the destructive actions get comfortable touch targets. Exported so the page
// can keep the last grid row scrollable above the bar.
export const CutSelectionBarContentHeight = 52;

/**
 * Bottom action bar shown while clip selection mode is active. It takes over
 * the tab bar's spot (the navigator hides the tab bar and safelight via
 * `shared/ui/tab-bar-chrome`) and slides up from the bottom edge.
 *
 * Mount-time slide uses a shared value instead of an `entering` preset —
 * Reanimated `entering` animations never start on iOS in Expo Go (see
 * `shared/ui/fade-in-view`).
 */
export function CutSelectionBar({
  selectedCount,
  allSelected,
  onCancel,
  onToggleSelectAll,
  onDelete,
}: CutSelectionBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const barHeight = CutSelectionBarContentHeight + insets.bottom;

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * barHeight }],
  }));

  const canDelete = selectedCount > 0;

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityLabel="선택 취소"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onCancel}
        style={styles.action}
      >
        <ThemedText type="smallBold" themeColor="textSecondary">
          취소
        </ThemedText>
      </Pressable>

      <ThemedText type="smallBold" style={styles.count}>
        {selectedCount}개 선택
      </ThemedText>

      <Pressable
        accessibilityLabel={allSelected ? '전체 해제' : '전체 선택'}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onToggleSelectAll}
        style={styles.action}
      >
        <ThemedText type="smallBold" themeColor="textSecondary">
          {allSelected ? '전체 해제' : '전체 선택'}
        </ThemedText>
      </Pressable>

      <Pressable
        accessibilityLabel={`${selectedCount}개 컷 삭제`}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canDelete }}
        disabled={!canDelete}
        hitSlop={8}
        onPress={onDelete}
        style={styles.action}
      >
        <ThemedText
          type="smallBold"
          style={{ color: canDelete ? theme.danger : theme.textSecondary }}
        >
          삭제
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  action: { minHeight: CutSelectionBarContentHeight, justifyContent: 'center' },
  count: { flex: 1, textAlign: 'center' },
});
