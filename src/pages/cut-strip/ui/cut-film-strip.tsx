import { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatDuration } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import type { CutDay, StripCut } from '../model/use-cut-strip';
import { CutFrame, CutFrameSlot, CutFrameWidth } from './cut-frame';

// Film geometry. Frames nearly touch, the way they do between two frame lines,
// and the sprocket holes run at a fixed pitch that ignores where the frames
// fall — that mismatch is what makes a strip read as film rather than a row.
const FrameGap = 3;
const StripPadding = 6;
const HolePitch = 11;

type CutFilmStripProps = {
  day: CutDay;
  selectionMode: boolean;
  selectedIds: ReadonlySet<string>;
  deletingIds: ReadonlySet<string>;
  onPressCut: (cut: StripCut) => void;
  onLongPressCut: (cut: StripCut) => void;
};

function Perforation({ holeCount }: { holeCount: number }) {
  const theme = useTheme();

  return (
    <View accessible={false} style={styles.perforation}>
      {Array.from({ length: holeCount }, (_, index) => (
        <View key={index} style={[styles.hole, { backgroundColor: theme.backgroundSelected }]} />
      ))}
    </View>
  );
}

function dayBadge(day: CutDay): { text: string; color: 'primary' | 'lumen' | 'textSecondary' } {
  switch (day.status) {
    case 'collecting':
      return { text: '담는 중', color: 'primary' };
    case 'ready':
      return { text: '현상 준비됨', color: 'lumen' };
    case 'developed':
      return { text: formatDuration(day.totalSec), color: 'textSecondary' };
  }
}

/**
 * One day of the archive as a single horizontal 35mm strip.
 *
 * Each day scrolls on its own axis, so a day with thirty cuts pushes only its
 * own row sideways and the vertical rhythm of the screen survives. Today's
 * strip carries its unfilled frames at the end — the soft target is an
 * invitation, and only today can still act on it.
 */
function CutFilmStripComponent({
  day,
  selectionMode,
  selectedIds,
  deletingIds,
  onPressCut,
  onLongPressCut,
}: CutFilmStripProps) {
  const theme = useTheme();
  const badge = dayBadge(day);
  const frameCount = day.cuts.length + day.emptySlotCount;
  const stripWidth = frameCount * (CutFrameWidth + FrameGap) - FrameGap + StripPadding * 2;
  const holeCount = Math.max(Math.floor(stripWidth / HolePitch), 2);

  return (
    <View style={styles.day}>
      <View style={styles.dayHead}>
        {/* 오늘 · 07-27 · 3컷, but 2026년 7월 20일 · 3컷 for a day whose name is
            already its date. */}
        <ThemedText type="edge" themeColor="textSecondary">
          {day.relativeLabel ? `${day.relativeLabel} · ${day.dayKey.slice(5)}` : day.label} ·{' '}
          {day.cuts.length}컷
        </ThemedText>
        <ThemedText type="edge" themeColor={badge.color}>
          {badge.text}
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.strip, { backgroundColor: theme.film }]}
      >
        <View style={{ width: stripWidth }}>
          <Perforation holeCount={holeCount} />
          <View style={styles.frames}>
            {day.cuts.map((cut) => (
              <CutFrame
                key={cut.clip.id}
                cut={cut}
                selectionMode={selectionMode}
                selected={selectedIds.has(cut.clip.id)}
                isDeleting={deletingIds.has(cut.clip.id)}
                onPress={() => onPressCut(cut)}
                onLongPress={() => onLongPressCut(cut)}
              />
            ))}
            {Array.from({ length: day.emptySlotCount }, (_, index) => (
              <CutFrameSlot key={`slot-${index}`} />
            ))}
          </View>
          <Perforation holeCount={holeCount} />
        </View>
      </ScrollView>
    </View>
  );
}

export const CutFilmStrip = memo(CutFilmStripComponent);

const styles = StyleSheet.create({
  day: { gap: Spacing.two },
  dayHead: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  // `overflow: hidden` so the film base is actually clipped to its corners on
  // Android, where a ScrollView otherwise paints past its radius.
  strip: { borderRadius: Radius.small, borderCurve: 'continuous', overflow: 'hidden' },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: StripPadding,
    paddingVertical: 4,
  },
  hole: { width: 5, height: 7, borderRadius: 1.5 },
  frames: { flexDirection: 'row', gap: FrameGap, paddingHorizontal: StripPadding },
});
