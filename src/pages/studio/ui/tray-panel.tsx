import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Snap } from '@/entities/snap';
import { TrayCapacity } from '@/entities/tray';
import { formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, Typography, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

export type TrayPanelProps = {
  /** The tray's snaps, in pick order. */
  snaps: Snap[];
  onPickMore: () => void;
  onRemove: (snapId: string) => void;
  onClear: () => void;
  onStartMovie: () => void;
};

const ThumbWidth = 52;
const RemoveMarkWidth = 20;
const MinTouchTarget = 44;
const RemoveMarkInset = 2;

/**
 * Grows the 20pt mark's target to 44pt — **inwards only**.
 *
 * A symmetric slop does not work here and measuring it on the device is how that
 * showed up (2026-08-12): the thumbnail clips its children (`overflow: 'hidden'`
 * for the rounded frame), and on Android a touch outside a clipping ancestor
 * never reaches the child, however much `hitSlop` it declares. A tap 8pt beyond
 * the thumbnail's edge did nothing while a tap 11pt inside it removed the snap.
 *
 * So the slop is spent in the two directions that stay inside the thumbnail: the
 * mark sits 2pt from the top-right corner, and the target extends 44pt down and
 * left from there. It covers most of the frame, which costs nothing — the
 * thumbnail itself is not a control.
 */
const RemoveHitSlop = {
  top: RemoveMarkInset,
  right: RemoveMarkInset,
  bottom: MinTouchTarget - RemoveMarkWidth - RemoveMarkInset,
  left: MinTouchTarget - RemoveMarkWidth - RemoveMarkInset,
} as const;

/**
 * Grows the empty row's 고르기 to a 44pt target. Symmetric is safe here: the
 * panel does not clip, so the slop reaches (unlike {@link RemoveHitSlop}).
 */
const PickHitSlop = (MinTouchTarget - Typography.small.lineHeight) / 2;

/**
 * The 담기 트레이 — the material picked out for the next movie.
 *
 * It is the studio's first block and never disappears: an empty tray still
 * offers the way out of being empty — because a studio whose workbench is blank
 * gives the user nowhere to start (concept §7).
 *
 * **Empty, it is one row**: the count and a 고르기 beside it, no strip and no
 * full-width button (2026-08-12). A 0/10 tray was spending the screen's strongest
 * position — first block, only button — on a trip to the Snap tab, which the tab
 * bar reaches in one tap anyway, and pushing the templates (the only thing on the
 * screen that says what to go and shoot) further down for it. The way out stays,
 * at the weight a duplicate entrance deserves. Filled, the panel is unchanged.
 */
export function TrayPanel({ snaps, onPickMore, onRemove, onClear, onStartMovie }: TrayPanelProps) {
  const theme = useTheme();
  const totalSec = snaps.reduce((sum, snap) => sum + snap.durationSec, 0);
  const isEmpty = snaps.length === 0;

  return (
    <View
      style={[
        styles.panel,
        isEmpty ? styles.compactPanel : null,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: isEmpty ? theme.border : theme.primary,
        },
      ]}
    >
      <View style={[styles.head, isEmpty ? styles.compactHead : null]}>
        <ThemedText type="smallBold">담아둔 스냅</ThemedText>
        <ThemedText type="note" themeColor={isEmpty ? 'textSecondary' : 'primary'}>
          {snaps.length} / {TrayCapacity}
          {isEmpty ? '' : ` · 약 ${formatSeconds(totalSec)}`}
        </ThemedText>
      </View>

      {isEmpty ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.strip}>
            {snaps.map((snap, index) => (
              <View key={snap.id} style={[styles.thumb, { borderColor: theme.border }]}>
                <VideoFrame uri={snap.uri} />
                <Pressable
                  accessibilityRole="button"
                  // Which one, not just what happens: every thumbnail carried the
                  // same label, so a screen reader announced the strip as N
                  // identical buttons. The number is the pick order the strip
                  // already draws left to right, and it is the cut order too.
                  accessibilityLabel={`${index + 1}번째 스냅 트레이에서 빼기`}
                  // The mark stays 20pt over the 52pt thumbnail; the target
                  // reaches 44 inwards — see RemoveHitSlop for why it cannot
                  // grow the other way.
                  hitSlop={RemoveHitSlop}
                  onPress={() => onRemove(snap.id)}
                  style={styles.remove}
                >
                  <ThemedText selectable={false} style={styles.removeMark}>
                    ×
                  </ThemedText>
                </Pressable>
              </View>
            ))}
            {snaps.length < TrayCapacity ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="스냅 더 담기"
                onPress={onPickMore}
                style={[styles.thumb, styles.addThumb, { borderColor: theme.border }]}
              >
                <ThemedText selectable={false} type="heading" themeColor="textSecondary">
                  +
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}

      {isEmpty ? (
        <Pressable
          accessibilityRole="button"
          // The row shows 고르기; the label says where it goes, since a screen
          // reader hears it without the 담아둔 스냅 heading beside it.
          accessibilityLabel="스냅 고르러 가기"
          hitSlop={PickHitSlop}
          onPress={onPickMore}
        >
          <ThemedText selectable={false} type="smallBold" themeColor="primary">
            고르기
          </ThemedText>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <SnaplyButton
            title="이 스냅으로 새 무비"
            onPress={onStartMovie}
            style={styles.primaryAction}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="트레이 비우기"
            onPress={onClear}
            style={[styles.clear, { borderColor: theme.border }]}
          >
            <ThemedText selectable={false} type="smallBold" themeColor="textSecondary">
              비우기
            </ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  compactPanel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Empty, the count reads as part of the heading rather than as the far end of
  // a row, and 고르기 takes the edge the count used to hold.
  compactHead: { flex: 1, justifyContent: 'flex-start', gap: Spacing.three },
  strip: { flexDirection: 'row', gap: Spacing.two },
  thumb: {
    width: ThumbWidth,
    height: ThumbWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  addThumb: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: RemoveMarkWidth,
    height: RemoveMarkWidth,
    borderRadius: RemoveMarkWidth / 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeMark: { color: '#FFFFFF', fontSize: 15, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: Spacing.two },
  primaryAction: { flex: 1 },
  clear: {
    minHeight: 56,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
