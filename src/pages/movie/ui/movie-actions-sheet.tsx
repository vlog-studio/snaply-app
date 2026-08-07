import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Movie } from '@/entities/movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export type MovieActionsSheetProps = {
  visible: boolean;
  movie: Movie;
  /** How many cuts the finished composition holds, for the delete step. */
  cutCount: number;
  /** How long it plays, for the delete step. */
  totalSec: number;
  /** True while the movie has no rendered file to hand to the share sheet. */
  shareBlocked: boolean;
  onEdit: () => void;
  onRename: () => void;
  onShare: () => void;
  /** Actually deletes — the confirm step inside this sheet has been passed. */
  onConfirmDelete: () => void;
  onClose: () => void;
};

/**
 * Everything watch mode can do to the movie besides watching it, behind the
 * back bar's ⋯ — so the mode's own surface stays a player, and switching to
 * the studio is a named choice rather than the screen's default.
 *
 * Deleting confirms as a second step *inside the same sheet* instead of a
 * second sheet: two platform Modals swapping visibility race each other's
 * animations, and the movie tab's grid never has this problem because its
 * delete sheet is its only one. The step resets whenever the sheet is left,
 * so it always reopens on the menu.
 */
export function MovieActionsSheet({
  visible,
  movie,
  cutCount,
  totalSec,
  shareBlocked,
  onEdit,
  onRename,
  onShare,
  onConfirmDelete,
  onClose,
}: MovieActionsSheetProps) {
  const theme = useTheme();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const close = () => {
    setConfirmingDelete(false);
    onClose();
  };
  const act = (action: () => void) => () => {
    setConfirmingDelete(false);
    action();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      accessibilityLabel={confirmingDelete ? '무비 삭제 확인' : '무비 더보기'}
    >
      {confirmingDelete ? (
        <View style={styles.step}>
          <ThemedText type="note" themeColor="danger">
            무비 삭제
          </ThemedText>
          <ThemedText type="heading">이 무비를 지울까요?</ThemedText>

          <View style={[styles.summary, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {movie.title}
            </ThemedText>
            <ThemedText type="note" themeColor="textSecondary">
              컷 {cutCount} · {formatSeconds(totalSec)}
            </ThemedText>
          </View>

          <ThemedText themeColor="textSecondary">
            컷 구성과 완성 기록이 함께 사라져요. 스냅 원본 영상은 그대로 남아요.
          </ThemedText>

          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="삭제 취소"
              onPress={() => setConfirmingDelete(false)}
              style={[styles.confirmAction, { borderColor: theme.border }]}
            >
              <ThemedText selectable={false} type="button">
                취소
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${movie.title} 삭제`}
              onPress={act(onConfirmDelete)}
              style={({ pressed }) => [
                styles.confirmAction,
                {
                  backgroundColor: theme.danger,
                  borderColor: theme.danger,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <ThemedText selectable={false} type="button" style={{ color: theme.onPrimary }}>
                삭제
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.step}>
          <View style={[styles.group, { borderColor: theme.border }]}>
            <ActionRow icon="film" label="무비 편집하기" onPress={act(onEdit)} />
            <ActionRow icon="pencil" label="이름 바꾸기" divider onPress={act(onRename)} />
            <ActionRow
              icon="share-social"
              label="공유하기"
              note={shareBlocked ? '아직 완성 파일이 만들어지지 않았어요' : undefined}
              disabled={shareBlocked}
              divider
              onPress={act(onShare)}
            />
          </View>
          <View style={[styles.group, { borderColor: theme.border }]}>
            <ActionRow
              icon="trash"
              label="무비 삭제하기"
              danger
              onPress={() => setConfirmingDelete(true)}
            />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

type ActionRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  /** Why the row cannot be pressed, shown under the label. */
  note?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Draws the hairline against the row above; the group's first row has none. */
  divider?: boolean;
  onPress: () => void;
};

function ActionRow({ icon, label, note, disabled, danger, divider, onPress }: ActionRowProps) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        divider ? [styles.rowDivider, { borderTopColor: theme.border }] : null,
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={19} color={color} />
      <View style={styles.rowText}>
        <ThemedText selectable={false} style={{ color }}>
          {label}
        </ThemedText>
        {note ? (
          <ThemedText selectable={false} type="note" themeColor="textSecondary">
            {note}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  step: { gap: Spacing.three },
  group: {
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingVertical: Spacing.two,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: Spacing.half },
  summary: {
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  confirmActions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.one },
  confirmAction: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
