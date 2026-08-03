import { StyleSheet, View } from 'react-native';

import { Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

/** The three steps every movie passes through (concept §6). */
export const EditorSteps = ['조립', '스타일', '생성'] as const;

export type EditorStep = 0 | 1 | 2;

export type WizardStepsProps = {
  current: EditorStep;
};

/**
 * The editor's progress header. Present from the first stage of the rebuild even
 * though only step ① is implemented: the wizard is what the screen *is*, and
 * hiding the other two would make the finished flow a surprise.
 */
export function WizardSteps({ current }: WizardStepsProps) {
  const theme = useTheme();

  return (
    <View accessibilityRole="tablist" style={styles.steps}>
      {EditorSteps.map((label, index) => {
        const isCurrent = index === current;
        const isDone = index < current;
        const color = isCurrent ? theme.primary : isDone ? theme.text : theme.textSecondary;

        return (
          <View key={label} style={styles.step}>
            <View
              style={[
                styles.bar,
                { backgroundColor: isCurrent || isDone ? theme.primary : theme.border },
              ]}
            />
            <ThemedText selectable={false} type="edge" style={{ color }}>
              {index + 1}. {label}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: Spacing.two },
  step: { flex: 1, gap: Spacing.one },
  bar: { height: 3, borderRadius: 2 },
});
