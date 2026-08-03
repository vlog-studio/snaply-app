import { Pressable, StyleSheet, View } from 'react-native';

import type { FilledSlot } from '@/features/fill-template';
import { formatDateTime, formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

export type SlotRowProps = {
  filled: FilledSlot;
  onShoot: (slotId: string) => void;
  onDrop: (slotId: string) => void;
  onRestore: (slotId: string) => void;
};

const FrameWidth = 54;
const FrameHeight = 96;

/**
 * One scene of the template: what to shoot, and what the match put there.
 *
 * The label is the instruction and the line under the frame is the evidence —
 * when the snap was taken, and how sure the app is it belongs to the same outing.
 * They are kept visibly separate on purpose: the app has not looked at the
 * picture and must not read as though it has, so it reports a time and a
 * percentage rather than claiming the snap *is* a 골목.
 */
export function SlotRow({ filled, onShoot, onDrop, onRestore }: SlotRowProps) {
  const theme = useTheme();
  const { slot, snap, confidence } = filled;

  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      {snap ? (
        <VideoFrame uri={snap.uri} style={styles.frame} />
      ) : (
        <View
          style={[
            styles.placeholder,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement },
          ]}
        >
          <ThemedText selectable={false} type="edge" themeColor="textSecondary">
            비어 있음
          </ThemedText>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText type="smallBold">{slot.label}</ThemedText>
          {confidence !== undefined ? (
            <ThemedText selectable={false} type="edge" themeColor="lumen">
              같은 외출 확신 {Math.round(confidence * 100)}%
            </ThemedText>
          ) : null}
        </View>

        <ThemedText type="small" themeColor="textSecondary">
          {snap
            ? `${formatDateTime(snap.capturedAt)} · ${formatSeconds(snap.durationSec)}`
            : slot.hint}
        </ThemedText>

        <View style={styles.actions}>
          {snap ? (
            confidence === undefined ? (
              <ThemedText selectable={false} type="edge" themeColor="primary">
                방금 찍은 컷
              </ThemedText>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${slot.label} 컷 빼기`}
                hitSlop={8}
                onPress={() => onDrop(slot.id)}
              >
                <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                  빼기
                </ThemedText>
              </Pressable>
            )
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${slot.label} 지금 찍기`}
                hitSlop={8}
                onPress={() => onShoot(slot.id)}
              >
                <ThemedText selectable={false} type="edge" themeColor="primary">
                  지금 찍기
                </ThemedText>
              </Pressable>
              {filled.isDropped ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.label} 되돌리기`}
                  hitSlop={8}
                  onPress={() => onRestore(slot.id)}
                >
                  <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                    되돌리기
                  </ThemedText>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.two,
  },
  frame: {
    width: FrameWidth,
    height: FrameHeight,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  placeholder: {
    width: FrameWidth,
    height: FrameHeight,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: Spacing.one, justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  actions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.half },
});
