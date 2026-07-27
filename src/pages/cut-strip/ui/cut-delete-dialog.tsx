import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import type { RollDeleteImpact } from '@/widgets/clip-membership';

import { RollStatusLabels } from './roll-status-label';

type CutDeleteDialogProps = {
  visible: boolean;
  cutCount: number;
  /** Every roll this deletion rewrites, with the cut count it loses. */
  impacts: RollDeleteImpact[];
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * The delete confirmation, in two stages: what is about to happen, and to whom.
 *
 * Deleting an original is the one action here that reaches outside the cut —
 * every roll holding it loses a frame, and a developed reel is rewritten. So the
 * dialog names those rolls and shows each one's cut count before and after
 * rather than reporting a bare number of rolls, and it points at 빼기 as the
 * smaller action whenever 빼기 is actually available.
 *
 * A platform `Alert` cannot carry the affected list, which is why this is a
 * dialog of its own.
 */
export function CutDeleteDialog({
  visible,
  cutCount,
  impacts,
  isDeleting,
  onCancel,
  onConfirm,
}: CutDeleteDialogProps) {
  const theme = useTheme();
  // Only offer the alternative when it exists: every affected roll being
  // developed means 빼기 is disabled everywhere it would be pressed.
  const canPullInstead = impacts.some((impact) => impact.canEditMembership);

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="삭제 취소"
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View
          accessibilityLabel="컷 삭제 확인"
          style={[
            styles.dialog,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <View style={styles.head}>
            <ThemedText type="heading">컷 {cutCount}개를 보관함에서 삭제할까요?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              원본 파일이 지워지고, 이 컷이 든 롤에서도 함께 사라져요.
            </ThemedText>
          </View>

          {impacts.length === 0 ? (
            <View style={[styles.noImpact, { borderColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                아직 어느 롤에도 담기지 않은 컷이에요.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.section}>
              <ThemedText type="edge" themeColor="textSecondary">
                영향받는 롤 {impacts.length}
              </ThemedText>
              <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {impacts.map((impact) => (
                  <View key={impact.rollId} style={styles.row}>
                    <View style={[styles.tint, { backgroundColor: impact.tint }]} />
                    {/* Name over count rather than side by side: a roll name and
                        an edge print competing for one line left whichever lost
                        clipped mid-glyph on Android. */}
                    <View style={styles.rowText}>
                      <ThemedText
                        selectable={false}
                        type="small"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {impact.title}
                      </ThemedText>
                      <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                        {RollStatusLabels[impact.status]} ·{' '}
                        {impact.status === 'developed' ? '릴 ' : ''}
                        {impact.cutCount}→{impact.nextCutCount}컷
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <ThemedText type="small" themeColor="danger">
            복구할 수 없어요.
            {canPullInstead ? ' 롤에서만 빼려면 빼기를 쓰세요.' : ''}
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="취소"
              accessibilityRole="button"
              disabled={isDeleting}
              onPress={onCancel}
              style={[styles.action, { borderColor: theme.border }]}
            >
              <ThemedText selectable={false} type="smallBold" themeColor="textSecondary">
                취소
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel={`컷 ${cutCount}개 삭제`}
              accessibilityRole="button"
              accessibilityState={{ disabled: isDeleting }}
              disabled={isDeleting}
              onPress={onConfirm}
              style={[styles.action, { borderColor: theme.danger, opacity: isDeleting ? 0.45 : 1 }]}
            >
              <ThemedText selectable={false} type="smallBold" themeColor="danger">
                삭제
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  dialog: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.four,
  },
  head: { gap: Spacing.two },
  section: { gap: Spacing.two },
  // Bounded so a deletion touching many rolls scrolls instead of growing the
  // dialog past the screen.
  list: { maxHeight: 168 },
  listContent: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  tint: { width: 8, height: 8, borderRadius: 4 },
  noImpact: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.three,
    alignItems: 'center',
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
