import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MovieSnapLimit } from '@/entities/movie';
import { Radius, Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { TimelinePxPerSec, rulerTicks, timelineCutMetrics } from '../model/timeline-layout';
import type { Cut } from '../model/use-movie-cuts';
import { TimelineCut, TimelineCutHeight } from './timeline-cut';

export type TimelineStripProps = {
  cuts: Cut[];
  /** Which cut the stage is on; -1 with an empty list. */
  selectedIndex: number;
  /** False while a job owns the movie — thumbs stay tappable, the add tile hides. */
  canEdit: boolean;
  onSelect: (index: number) => void;
  /** A settled trim-handle drag; the cut list holds it locally until a save. */
  onTrim: (index: number, startSec: number, endSec: number) => void;
  onAddSnaps: () => void;
};

const TickLabelWidth = 48;

/**
 * The movie as a timeline: every cut drawn as long as it plays, on one shared
 * seconds scale, under a ruler of second marks.
 *
 * Tapping a clip selects the cut — the stage jumps there and the inspector
 * below picks it up — and the strip keeps the selected clip in view as
 * playback advances, so the row and the stage always point at the same cut.
 * The selected clip is also where the cut's length is set: while editable it
 * expands to its whole snap and grows trim handles (`TimelineCut`), and the
 * strip's scroll is locked while a handle is down so the drag owns the axis.
 * A cut whose original was deleted keeps its clip (marked, selectable) —
 * a cut the user cannot see is a cut they cannot remove.
 */
export function TimelineStrip({
  cuts,
  selectedIndex,
  canEdit,
  onSelect,
  onTrim,
  onAddSnaps,
}: TimelineStripProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const room = Math.max(MovieSnapLimit - cuts.length, 0);

  // True while a trim handle is down; the scroll hands the axis to the drag.
  const [trimming, setTrimming] = useState(false);

  const expandedIndex =
    canEdit && selectedIndex >= 0 && cuts[selectedIndex]?.snap !== undefined ? selectedIndex : -1;
  const metrics = timelineCutMetrics(
    cuts.map((cut) => ({ usedSec: cut.usedSec, fullSec: cut.snap?.durationSec })),
    expandedIndex,
    TimelinePxPerSec,
  );
  const lastMetric = metrics.length > 0 ? metrics[metrics.length - 1] : undefined;
  const stripWidth = lastMetric ? lastMetric.x + lastMetric.width : 0;
  const ticks = rulerTicks(stripWidth, TimelinePxPerSec);

  // Keep the selected clip centered as playback or edits move the selection.
  const selectedMetric = selectedIndex >= 0 ? metrics[selectedIndex] : undefined;
  const selectedCenter = selectedMetric ? selectedMetric.x + selectedMetric.width / 2 : undefined;
  useEffect(() => {
    if (selectedCenter === undefined) return;
    scrollRef.current?.scrollTo({
      x: Math.max(selectedCenter - windowWidth / 2, 0),
      animated: !reducedMotion,
    });
  }, [selectedCenter, windowWidth, reducedMotion]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      scrollEnabled={!trimming}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      <View>
        {/* The ruler shares the clips' origin and scale, so a mark is over the
            moment it names. */}
        <View style={[styles.ruler, { width: stripWidth }]}>
          {ticks.map((tick) =>
            tick.labelSec !== undefined ? (
              <View key={tick.x} style={[styles.tickLabel, { left: tick.x - TickLabelWidth / 2 }]}>
                <ThemedText selectable={false} type="xsmall" themeColor="textSecondary">
                  {tick.labelSec}초
                </ThemedText>
              </View>
            ) : (
              <View
                key={tick.x}
                style={[styles.tickDot, { left: tick.x - 1.5, backgroundColor: theme.border }]}
              />
            ),
          )}
        </View>

        <View style={styles.row}>
          {cuts.map((cut, index) => (
            <TimelineCut
              key={cut.ref.snapId}
              cut={cut}
              index={index}
              selected={index === selectedIndex}
              expanded={index === expandedIndex}
              width={metrics[index].width}
              pxPerSec={TimelinePxPerSec}
              onSelect={onSelect}
              onTrim={onTrim}
              onTrimmingChange={setTrimming}
            />
          ))}

          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="스냅 더 넣기"
              accessibilityState={{ disabled: room === 0 }}
              disabled={room === 0}
              onPress={onAddSnaps}
              style={[
                styles.addTile,
                { borderColor: theme.border, opacity: room === 0 ? 0.45 : 1 },
              ]}
            >
              <Ionicons name="add" size={20} color={theme.primary} />
              <ThemedText selectable={false} type="xsmall" themeColor="textSecondary">
                {room > 0 ? `${room}개 더` : '가득 참'}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
  },
  ruler: {
    height: 18,
    marginBottom: Spacing.one,
  },
  tickLabel: {
    position: 'absolute',
    top: 0,
    width: TickLabelWidth,
    alignItems: 'center',
  },
  tickDot: {
    position: 'absolute',
    top: 8,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTile: {
    width: TimelineCutHeight,
    height: TimelineCutHeight,
    marginLeft: Spacing.two,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
