import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MovieSnapLimit } from '@/entities/movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

import type { Cut } from '../model/use-movie-cuts';

export type TimelineStripProps = {
  cuts: Cut[];
  /** Which cut the stage is on; -1 with an empty list. */
  selectedIndex: number;
  /** False while a job owns the movie — thumbs stay tappable, the add tile hides. */
  canEdit: boolean;
  onSelect: (index: number) => void;
  onAddSnaps: () => void;
};

const ThumbWidth = 48;
const ThumbHeight = Math.round((ThumbWidth * 16) / 9);
const ThumbGap = Spacing.one;

/**
 * The movie as a filmstrip: every cut in order, one thumb each, scrolled
 * sideways under the stage.
 *
 * Tapping a thumb selects the cut — the stage jumps there and the inspector
 * below picks it up — and the strip keeps the selected thumb in view as
 * playback advances, so the row and the stage always point at the same cut.
 * A cut whose original was deleted keeps its thumb (marked, selectable) —
 * a cut the user cannot see is a cut they cannot remove.
 */
export function TimelineStrip({
  cuts,
  selectedIndex,
  canEdit,
  onSelect,
  onAddSnaps,
}: TimelineStripProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const room = Math.max(MovieSnapLimit - cuts.length, 0);

  // Keep the selected thumb centered as playback or edits move the selection.
  useEffect(() => {
    if (selectedIndex < 0) return;
    const x = selectedIndex * (ThumbWidth + ThumbGap) - (windowWidth - ThumbWidth) / 2;
    scrollRef.current?.scrollTo({ x: Math.max(x, 0), animated: !reducedMotion });
  }, [selectedIndex, windowWidth, reducedMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {cuts.map((cut, index) => {
        const selected = index === selectedIndex;
        const missing = cut.snap === undefined;
        return (
          <Pressable
            key={cut.ref.snapId}
            accessibilityRole="button"
            accessibilityLabel={`컷 ${index + 1}${missing ? ' · 원본 삭제됨' : ''} · ${formatSeconds(cut.usedSec)}`}
            accessibilityState={{ selected }}
            onPress={() => onSelect(index)}
            style={[
              styles.thumb,
              {
                backgroundColor: theme.media,
                borderColor: missing ? theme.danger : selected ? theme.amber : theme.border,
                borderWidth: selected || missing ? 2 : 1,
              },
            ]}
          >
            {cut.snap ? <VideoFrame uri={cut.snap.uri} /> : null}
            {missing ? (
              <View style={styles.missingMark}>
                <ThemedText selectable={false} type="smallBold" themeColor="danger">
                  !
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.badges} pointerEvents="none">
              <ThemedText selectable={false} style={styles.number}>
                {index + 1}
              </ThemedText>
              <ThemedText selectable={false} style={styles.duration}>
                {formatSeconds(cut.usedSec)}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}

      {canEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="스냅 더 넣기"
          accessibilityState={{ disabled: room === 0 }}
          disabled={room === 0}
          onPress={onAddSnaps}
          style={[styles.addTile, { borderColor: theme.border, opacity: room === 0 ? 0.45 : 1 }]}
        >
          <ThemedText selectable={false} type="heading" themeColor="primary">
            +
          </ThemedText>
          <ThemedText selectable={false} type="xsmall" themeColor="textSecondary">
            {room > 0 ? `${room}개 더` : '가득 참'}
          </ThemedText>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: ThumbGap,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  thumb: {
    width: ThumbWidth,
    height: ThumbHeight,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  missingMark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    position: 'absolute',
    left: Spacing.one,
    right: Spacing.one,
    bottom: Spacing.one,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  // Drawn over arbitrary video, so plain white with a shadow rather than a
  // palette color (the counter in the stage does the same).
  number: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 3,
  },
  duration: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 3,
  },
  addTile: {
    width: ThumbWidth,
    height: ThumbHeight,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
