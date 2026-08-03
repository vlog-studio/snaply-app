import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

/** The three steps every movie passes through (concept §6). */
export const EditorSteps = ['조립', '스타일', '생성'] as const;

export type EditorStep = 0 | 1 | 2;

export type WizardStepsProps = {
  current: EditorStep;
  onSelect: (step: EditorStep) => void;
};

/**
 * The editor's progress header, and its shortest route between steps.
 *
 * The steps are tappable as well as walkable with 이전/다음: coming back to a
 * draft to change one thing — the music, usually — should not mean paging through
 * the list of cuts. Selecting a step goes through the same handler the footer
 * uses, so leaving the cut list still commits it.
 */
export function WizardSteps({ current, onSelect }: WizardStepsProps) {
  const theme = useTheme();

  return (
    <View accessibilityRole="tablist" style={styles.steps}>
      {EditorSteps.map((label, index) => {
        const isCurrent = index === current;
        const isDone = index < current;
        const color = isCurrent ? theme.primary : isDone ? theme.text : theme.textSecondary;

        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: isCurrent }}
            accessibilityLabel={`${index + 1}. ${label}`}
            onPress={() => onSelect(index as EditorStep)}
            style={styles.step}
          >
            <View
              style={[
                styles.bar,
                { backgroundColor: isCurrent || isDone ? theme.primary : theme.border },
              ]}
            />
            <ThemedText selectable={false} type="edge" style={{ color }}>
              {index + 1}. {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: Spacing.two },
  step: { flex: 1, gap: Spacing.one, paddingVertical: Spacing.one },
  bar: { height: 3, borderRadius: 2 },
});
