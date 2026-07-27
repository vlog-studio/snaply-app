import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { CutFilter, CutRollFilterOption } from '../model/use-cut-strip';

type CutFilterBarProps = {
  filter: CutFilter;
  looseCount: number;
  /** The roll a `roll` filter is narrowed to, resolved by the page. */
  activeRoll: CutRollFilterOption | undefined;
  /** False when no roll holds a cut yet — nothing to narrow to. */
  canFilterByRoll: boolean;
  onSelect: (filter: CutFilter) => void;
  onOpenRollPicker: () => void;
};

type Chip = { key: string; label: string; filter: CutFilter };

const BaseChips: Chip[] = [
  { key: 'all', label: '전체', filter: { kind: 'all' } },
  { key: 'undeveloped', label: '미현상', filter: { kind: 'undeveloped' } },
];

/**
 * The strip's four ways in: everything, everything not yet made into a reel,
 * the cuts nothing holds, and one roll at a time.
 *
 * `롤 없음` shows its count in the chip itself — it is the pile the collection
 * actions exist for, so its size should be legible before it is chosen.
 */
export function CutFilterBar({
  filter,
  looseCount,
  activeRoll,
  canFilterByRoll,
  onSelect,
  onOpenRollPicker,
}: CutFilterBarProps) {
  const theme = useTheme();

  const chips: Chip[] = [
    ...BaseChips,
    { key: 'loose', label: `롤 없음 ${looseCount}`, filter: { kind: 'loose' } },
  ];

  const rollChipActive = filter.kind === 'roll';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const isActive = filter.kind === chip.filter.kind;
        return (
          <Pressable
            key={chip.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(chip.filter)}
            style={[
              styles.chip,
              {
                borderColor: isActive ? theme.primary : theme.border,
                backgroundColor: isActive ? theme.backgroundSelected : 'transparent',
              },
            ]}
          >
            <ThemedText
              selectable={false}
              type="edge"
              style={{ color: isActive ? theme.text : theme.textSecondary }}
            >
              {chip.label}
            </ThemedText>
          </Pressable>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={activeRoll ? `롤 필터: ${activeRoll.title}` : '롤별로 보기'}
        accessibilityState={{ selected: rollChipActive, disabled: !canFilterByRoll }}
        disabled={!canFilterByRoll}
        onPress={onOpenRollPicker}
        style={[
          styles.chip,
          {
            borderColor: rollChipActive ? theme.primary : theme.border,
            backgroundColor: rollChipActive ? theme.backgroundSelected : 'transparent',
            opacity: canFilterByRoll ? 1 : 0.5,
          },
        ]}
      >
        {activeRoll ? (
          <View style={[styles.chipDot, { backgroundColor: activeRoll.tint }]} />
        ) : null}
        <ThemedText
          selectable={false}
          type="edge"
          numberOfLines={1}
          style={[
            styles.rollChipText,
            { color: rollChipActive ? theme.text : theme.textSecondary },
          ]}
        >
          {activeRoll ? activeRoll.title : '롤별'} ▾
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, paddingRight: Spacing.five },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
  },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  rollChipText: { maxWidth: 140 },
});
