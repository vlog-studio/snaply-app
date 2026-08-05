import { StyleSheet, Switch, View } from 'react-native';

import { isAiArranged, type Movie } from '@/entities/movie';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type ArrangementRowProps = {
  movie: Movie;
  onChange: (locked: boolean) => void;
};

/**
 * The 순서 고정 switch: whether the next generation may re-arrange the cuts.
 *
 * It is only ever *offered*, never required. Rearranging a cut by hand already
 * turns the lock on, because that is what the user meant by moving it — the
 * switch exists so they can hand the order back afterwards, and so a movie the
 * AI arranged says out loud that it did.
 *
 * Today "the AI arranges" means capture-time order, which is what template
 * matching produced in the first place; it becomes visible when a snap is
 * appended to an AI-arranged movie and drops into its place in the day instead
 * of sitting at the end.
 */
export function ArrangementRow({ movie, onChange }: ArrangementRowProps) {
  const theme = useTheme();
  const isLocked = !isAiArranged(movie);

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.copy}>
        <ThemedText type="smallBold">순서 고정</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {isLocked
            ? '지금 순서 그대로 만들어져요.'
            : 'AI가 정한 순서예요. 만들 때 찍은 시각 순서로 다시 배치돼요.'}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel="컷 순서 고정"
        value={isLocked}
        onValueChange={onChange}
        trackColor={{ true: theme.primary }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
  copy: { flex: 1, gap: Spacing.half },
});
