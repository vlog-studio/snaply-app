import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrayCapacity } from '@/entities/tray';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type SnapSelectionBarProps = {
  selectedCount: number;
  /** Snaps the tray already holds — what the remaining room is measured against. */
  trayCount: number;
  onClear: () => void;
  onAddToTray: () => void;
  onDelete: () => void;
};

/**
 * The selection mode's bottom bar: how many snaps are picked against the tray's
 * remaining room, and the two things that can be done with them.
 *
 * It reports the tray's room rather than a bare count because the cap is the
 * product's one hard constraint (concept §5) and the moment it bites is here —
 * the user has to see why an eleventh pick is refused.
 */
export function SnapSelectionBar({
  selectedCount,
  trayCount,
  onClear,
  onAddToTray,
  onDelete,
}: SnapSelectionBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const room = Math.max(TrayCapacity - trayCount, 0);
  const canAdd = selectedCount > 0 && room > 0;

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
        <ThemedText type="smallBold">{selectedCount}개 선택</ThemedText>
        <ThemedText type="edge" themeColor={room === 0 ? 'danger' : 'textSecondary'}>
          트레이 {trayCount}/{TrayCapacity}
          {room === 0 ? ' · 가득 참' : ` · ${room}개 더`}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${selectedCount}개 스냅 삭제`}
          accessibilityState={{ disabled: selectedCount === 0 }}
          disabled={selectedCount === 0}
          hitSlop={8}
          onPress={onDelete}
          style={styles.textAction}
        >
          <ThemedText
            selectable={false}
            type="smallBold"
            style={{ color: selectedCount > 0 ? theme.danger : theme.textSecondary }}
          >
            삭제
          </ThemedText>
        </Pressable>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="트레이에 담기"
          accessibilityState={{ disabled: !canAdd }}
          disabled={!canAdd}
          onPress={onAddToTray}
          style={({ pressed }) => [
            styles.primaryAction,
            { backgroundColor: theme.primary, opacity: canAdd ? (pressed ? 0.78 : 1) : 0.45 },
          ]}
        >
          <ThemedText selectable={false} type="button" style={{ color: theme.onPrimary }}>
            트레이에 담기
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
  counts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
