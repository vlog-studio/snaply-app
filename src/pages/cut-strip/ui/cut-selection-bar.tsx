import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CutSelectionBarProps = {
  selectedCount: number;
  allSelected: boolean;
  /** What the strip is narrowed to right now, printed next to the count. */
  contextLabel: string;
  /**
   * Title of the roll the strip is filtered to, or undefined outside a roll
   * context. 롤에서 빼기 needs a "from where" to mean anything, so it only
   * appears here.
   */
  pullRollTitle: string | undefined;
  onCancel: () => void;
  onToggleSelectAll: () => void;
  onAddToRoll: () => void;
  onPullFromRoll: () => void;
  onDelete: () => void;
};

// Content height of the selection action bar: a context row over an action row.
// Exported so the page can keep the last strip scrollable above the bar.
export const CutSelectionBarContentHeight = 100;

type ActionTone = 'primary' | 'plain' | 'danger';

/**
 * Bottom action bar shown while cut selection is active. It slides up from the
 * bottom edge and simply owns it — this screen is pushed over the tabs, so
 * there is no tab bar underneath to hide.
 *
 * The actions follow the filter. Collecting is the default reason to select
 * cuts, so 담기 leads and 삭제 is pushed to the end; 빼기 joins them only when
 * the strip is narrowed to a roll, because that is the only context in which
 * "빼기" has an answer to "out of what". (새 롤로 묶기 takes the leading slot
 * once rolls can be made by hand.)
 *
 * Mount-time slide uses a shared value instead of an `entering` preset —
 * Reanimated `entering` animations never start on iOS in Expo Go (see
 * `shared/ui/fade-in-view`).
 */
export function CutSelectionBar({
  selectedCount,
  allSelected,
  contextLabel,
  pullRollTitle,
  onCancel,
  onToggleSelectAll,
  onAddToRoll,
  onPullFromRoll,
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

  const hasSelection = selectedCount > 0;

  const toneStyle = (tone: ActionTone, enabled: boolean) => ({
    backgroundColor: tone === 'primary' && enabled ? theme.primary : 'transparent',
    borderColor: tone === 'danger' && enabled ? theme.danger : theme.border,
    opacity: enabled ? 1 : 0.45,
  });

  const toneColor = (tone: ActionTone, enabled: boolean) => {
    if (!enabled) return theme.textSecondary;
    if (tone === 'primary') return theme.onPrimary;
    if (tone === 'danger') return theme.danger;
    return theme.text;
  };

  const renderAction = (
    tone: ActionTone,
    label: string,
    accessibilityLabel: string,
    onPress: () => void,
  ) => (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: !hasSelection }}
      disabled={!hasSelection}
      onPress={onPress}
      style={[styles.action, toneStyle(tone, hasSelection)]}
    >
      <ThemedText
        selectable={false}
        type="smallBold"
        style={{ color: toneColor(tone, hasSelection) }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + Spacing.two,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.contextRow}>
        <Pressable
          accessibilityLabel="선택 취소"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onCancel}
          style={styles.contextAction}
        >
          <ThemedText type="smallBold" themeColor="textSecondary">
            취소
          </ThemedText>
        </Pressable>

        <View style={styles.countGroup}>
          <ThemedText type="smallBold">{selectedCount}컷 선택</ThemedText>
          <ThemedText type="edge" themeColor="textSecondary" numberOfLines={1}>
            {contextLabel}
          </ThemedText>
        </View>

        <Pressable
          accessibilityLabel={allSelected ? '전체 해제' : '전체 선택'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToggleSelectAll}
          style={styles.contextAction}
        >
          <ThemedText type="smallBold" themeColor="textSecondary">
            {allSelected ? '전체 해제' : '전체 선택'}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        {pullRollTitle
          ? renderAction(
              'primary',
              '롤에서 빼기',
              `${selectedCount}컷을 ${pullRollTitle}에서 빼기`,
              onPullFromRoll,
            )
          : null}
        {renderAction(
          pullRollTitle ? 'plain' : 'primary',
          '롤에 담기',
          `${selectedCount}컷 롤에 담기`,
          onAddToRoll,
        )}
        {renderAction('danger', '삭제', `${selectedCount}컷 삭제`, onDelete)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  contextRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  contextAction: { minHeight: 30, justifyContent: 'center' },
  countGroup: { flex: 1, alignItems: 'center', gap: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  action: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
});
