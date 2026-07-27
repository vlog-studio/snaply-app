import { Pressable, StyleSheet, View } from 'react-native';

import { ManualRollTitleMaxLength } from '@/entities/roll';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { TextField } from '@/shared/ui/text-field';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CutNewRollSheetProps = {
  visible: boolean;
  /** How many cuts are going in — printed in the heading and on the button. */
  cutCount: number;
  /** The name typed so far. Owned by the page, along with the cuts it names. */
  title: string;
  /** What a blank name will be saved as, shown as the placeholder. */
  defaultTitle: string;
  /**
   * Set when the last attempt failed. The sheet stays open with the typed name
   * intact so the user can simply press again.
   */
  errorMessage: string | undefined;
  onChangeTitle: (title: string) => void;
  onCreate: () => void;
  onClose: () => void;
};

/** The values a hand-made roll is fixed at, shown as an imprint, not a control. */
const FixedSpecs = [
  { label: '성격', value: '자유 롤' }, // 성격 · 자유 롤
  { label: '수집', value: '수동' }, // 수집 · 수동
  { label: '지향', value: '세로' }, // 지향 · 세로
];

/**
 * Turns the selected cuts into a roll of their own.
 *
 * It asks for one thing: a name, and not even that — leaving it blank saves the
 * roll under the day it was made, because demanding a name is friction at the
 * exact moment the user is collecting.
 *
 * Character, collection rule, and orientation are printed but not offered.
 * They are fixed at 자유 롤 · 수동 · 세로 for now: character changes BGM tone,
 * length, and cover style, none of which is implemented, and a chip that does
 * nothing when pressed is worse than no chip. They arrive with themed rolls.
 *
 * The draft name belongs to the bundle being made rather than to the sheet, so
 * the page owns it: reopening for a different selection must not offer the last
 * one's name, and which day a blank name falls back to is a question about the
 * clock that a render must not ask.
 */
export function CutNewRollSheet({
  visible,
  cutCount,
  title,
  defaultTitle,
  errorMessage,
  onChangeTitle,
  onCreate,
  onClose,
}: CutNewRollSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="새 롤로 묶기">
      <View style={styles.head}>
        <ThemedText type="heading">새 롤로 묶기</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {cutCount}컷이 하나의 롤이 돼요. 미현상으로 시작해 바로 현상할 수 있어요.
        </ThemedText>
      </View>

      <TextField
        label="롤 이름 · 비워도 됨"
        placeholder={defaultTitle}
        value={title}
        onChangeText={onChangeTitle}
        maxLength={ManualRollTitleMaxLength}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={onCreate}
      />
      <ThemedText type="edge" themeColor="textSecondary">
        비우면 {defaultTitle}로 저장돼요 · 최대 {ManualRollTitleMaxLength}자
      </ThemedText>

      <View style={styles.specRow}>
        {FixedSpecs.map((spec) => (
          <View key={spec.label} style={[styles.spec, { borderColor: theme.border }]}>
            <ThemedText selectable={false} type="edge" themeColor="textSecondary">
              {spec.label}
            </ThemedText>
            <ThemedText selectable={false} type="edge">
              {spec.value}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        원본은 보관함에 그대로 남고, 롤은 참조만 해요.
      </ThemedText>

      {errorMessage ? (
        <View style={[styles.error, { borderColor: theme.danger }]}>
          <ThemedText type="smallBold" themeColor="danger">
            {errorMessage}
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="새 롤 만들기 취소"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.action, { borderColor: theme.border }]}
        >
          <ThemedText selectable={false} type="smallBold" themeColor="textSecondary">
            취소
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityLabel={`${cutCount}컷으로 롤 만들기`}
          accessibilityRole="button"
          onPress={onCreate}
          style={[styles.action, styles.primary, { backgroundColor: theme.primary }]}
        >
          <ThemedText selectable={false} type="smallBold" style={{ color: theme.onPrimary }}>
            {cutCount}컷으로 만들기
          </ThemedText>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: Spacing.one, paddingBottom: Spacing.two },
  specRow: { flexDirection: 'row', gap: Spacing.two },
  spec: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  error: { borderWidth: 1, borderRadius: Radius.medium, padding: Spacing.three },
  actions: { flexDirection: 'row', gap: Spacing.two, paddingTop: Spacing.one },
  action: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { flex: 1.4, borderColor: 'transparent' },
});
