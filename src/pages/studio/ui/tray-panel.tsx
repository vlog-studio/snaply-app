import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Snap } from '@/entities/snap';
import { TrayCapacity } from '@/entities/tray';
import { formatSeconds } from '@/shared/lib/datetime';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
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

/**
 * The 담기 트레이 — the material picked out for the next movie.
 *
 * It is the studio's first block and never disappears: an empty tray still
 * offers the way out of being empty — the 스냅 고르러 가기 button, in place of
 * the strip — because a studio whose workbench is blank gives the user nowhere
 * to start (concept §7). The button is the whole answer; the sentence that used
 * to sit above it only narrated what the button already says.
 */
export function TrayPanel({ snaps, onPickMore, onRemove, onClear, onStartMovie }: TrayPanelProps) {
  const theme = useTheme();
  const totalSec = snaps.reduce((sum, snap) => sum + snap.durationSec, 0);
  const isEmpty = snaps.length === 0;

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: isEmpty ? theme.border : theme.primary,
        },
      ]}
    >
      <View style={styles.head}>
        <ThemedText type="smallBold">담아둔 스냅</ThemedText>
        <ThemedText type="note" themeColor={isEmpty ? 'textSecondary' : 'primary'}>
          {snaps.length} / {TrayCapacity}
          {isEmpty ? '' : ` · 약 ${formatSeconds(totalSec)}`}
        </ThemedText>
      </View>

      {isEmpty ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.strip}>
            {snaps.map((snap) => (
              <View key={snap.id} style={[styles.thumb, { borderColor: theme.border }]}>
                <VideoFrame uri={snap.uri} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="트레이에서 빼기"
                  hitSlop={6}
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
        <SnaplyButton title="스냅 고르러 가기" variant="secondary" onPress={onPickMore} />
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strip: { flexDirection: 'row', gap: Spacing.two },
  thumb: {
    width: ThumbWidth,
    height: Math.round((ThumbWidth * 16) / 9),
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
