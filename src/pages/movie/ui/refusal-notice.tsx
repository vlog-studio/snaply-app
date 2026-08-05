import { StyleSheet, View } from 'react-native';

import type { CutsRefusal, GenerationRefusal } from '@/features/compose-movie';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

/** Why a cut edit was refused, in the user's words. */
export const CutsRefusalMessages: Record<CutsRefusal, string> = {
  empty: '컷이 최소 1개는 있어야 해요.',
  full: '한 편에 들어가는 스냅 수를 넘었어요.',
  frozen: '만드는 동안에는 컷을 고칠 수 없어요.',
};

/** Why a run could not be started, in the user's words. */
export const GenerationRefusalMessages: Record<GenerationRefusal, string> = {
  empty: '컷이 하나도 없어서 만들 수 없어요. 스냅을 먼저 넣어주세요.',
  frozen: '이미 만드는 중이에요.',
};

/**
 * The line that answers a refusal — one component, one message table, for both
 * places a refusal surfaces.
 *
 * A refused edit is normally answered in the footer, under the button that
 * refused it; while a job owns the movie the footer is gone, and the refusal
 * still has to be answered. Wording the same rule in two files is how two
 * surfaces come to disagree about it, which the rules the refusals stand for
 * (`features/compose-movie`) exist to prevent.
 */
export function RefusalNotice({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.notice, { borderColor: theme.border, backgroundColor: theme.warmSurface }]}
    >
      <ThemedText type="small">{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
  },
});
