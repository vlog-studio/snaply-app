import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { getCaptureMoodLabel } from '@/entities/capture-session';
import type { Clip } from '@/entities/clip';
import { NegativeFrame } from '@/shared/ui/negative-frame';
import { Radius, Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import {
  gridHeight,
  movedOrder,
  slotIndexAtPoint,
  slotPoint,
  type ReorderGridSpec,
} from '../model/reorder-layout';

export type CutSheetMode = 'view' | 'select' | 'reorder';

// The standardized contact-sheet geometry: 3 columns of 30%-width, 0.72-aspect
// cells with a Spacing.three gap. Cells are positioned absolutely from this
// math (instead of a wrapping flex row) so a cut can animate between slots.
const COLUMNS = 3;
const CELL_WIDTH_RATIO = 0.3;
const CELL_ASPECT_RATIO = 0.72;

// Holding this long lifts the cut in reorder mode; shorter touches stay
// scrolls/taps. Matches the view mode's long-press-to-select delay so both
// edit entries feel like one gesture family.
const LIFT_AFTER_MS = 260;

// A quick, near-critically-damped shuffle: cuts step aside fast enough to
// track the finger but glide straight into their slot with no visible bounce.
const SHUFFLE_SPRING = { damping: 44, stiffness: 300 };
const LIFT_MS = 120;

type CutSheetGridProps = {
  /** The roll's cuts in their committed order. */
  clips: Clip[];
  /** Trailing dashed slots, so the 12-frame contact sheet keeps its shape. */
  emptySlotCount: number;
  /**
   * Content width, computed by the page. Passed in so the grid can position
   * its cells from the very first frame — self-measuring via onLayout would
   * render an empty (collapsed) sheet for a frame.
   */
  width: number;
  mode: CutSheetMode;
  /** Cuts currently ticked (select mode only). */
  selectedIds: ReadonlySet<string>;
  /** Whether editing gestures (long-press select) are available at all. */
  canEdit: boolean;
  /**
   * The pending order while reordering (page-owned; seeded on mode entry).
   * Only read in reorder mode — outside it the committed clips order rules.
   */
  workingOrder: string[] | undefined;
  onPressCut: (clip: Clip, index: number) => void;
  onLongPressCut: (clip: Clip) => void;
  onPressEmptySlot: () => void;
  /** Fired after every drag swap with the full working order. */
  onOrderChange: (orderedClipIds: string[]) => void;
  /** Lets the page lock its ScrollView while a cut is being dragged. */
  onDragActiveChange: (active: boolean) => void;
};

/**
 * The roll's contact sheet for every mode. One grid — the cells are never
 * remounted when the mode changes, which is what keeps the thumbnails from
 * blinking on entering/leaving reorder mode (a remounted expo-image cannot
 * paint its first frame even from the memory cache).
 *
 * View/select behavior lives on each cell's Pressable; reorder is a
 * long-press-lift pan whose working order lives in a shared value so every
 * reaction happens on the UI thread. Cancelling a reorder writes the committed
 * order back, visibly springing the cuts home.
 */
export function CutSheetGrid({
  clips,
  emptySlotCount,
  width,
  mode,
  selectedIds,
  canEdit,
  workingOrder,
  onPressCut,
  onLongPressCut,
  onPressEmptySlot,
  onOrderChange,
  onDragActiveChange,
}: CutSheetGridProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  const clipIds = useMemo(() => clips.map((clip) => clip.id), [clips]);

  // The visual order's UI-thread source of truth. While reordering the drag
  // worklets own it; at all other times the committed clips order is written
  // back — which is also what springs the cuts home on 취소.
  const orderShared = useSharedValue<string[]>(clipIds);
  useEffect(() => {
    if (mode === 'reorder') return;
    orderShared.value = clipIds;
  }, [mode, clipIds, orderShared]);

  const handleLift = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDragActiveChange(true);
  }, [onDragActiveChange]);

  const handleSettle = useCallback(() => {
    onDragActiveChange(false);
  }, [onDragActiveChange]);

  const spec = useMemo<ReorderGridSpec | undefined>(() => {
    if (width <= 0) return undefined;
    const cellWidth = width * CELL_WIDTH_RATIO;
    return {
      columns: COLUMNS,
      cellWidth,
      cellHeight: cellWidth / CELL_ASPECT_RATIO,
      gap: Spacing.three,
    };
  }, [width]);

  // What the number badges print: the pending order mid-reorder, the committed
  // order otherwise.
  const displayOrder = mode === 'reorder' && workingOrder ? workingOrder : clipIds;
  const canAdd = canEdit && mode === 'view';

  return (
    <View
      style={[
        styles.container,
        spec && { height: gridHeight(clips.length + emptySlotCount, spec) },
      ]}
    >
      {spec ? (
        <>
          {clips.map((clip, index) => {
            const orderIndex = displayOrder.indexOf(clip.id);
            return (
              <SheetCut
                key={clip.id}
                clip={clip}
                initialIndex={index}
                number={(orderIndex === -1 ? index : orderIndex) + 1}
                mode={mode}
                selected={selectedIds.has(clip.id)}
                canEdit={canEdit}
                spec={spec}
                slotCount={clips.length}
                orderShared={orderShared}
                reducedMotion={reducedMotion}
                onPress={onPressCut}
                onLongPress={onLongPressCut}
                onLift={handleLift}
                onSettle={handleSettle}
                onOrderSync={onOrderChange}
              />
            );
          })}
          {Array.from({ length: emptySlotCount }).map((_, index) => {
            const point = slotPoint(clips.length + index, spec);
            return (
              <Pressable
                key={`empty-${index}`}
                accessibilityLabel={canAdd ? '컷 추가' : '빈 슬롯'}
                accessibilityRole={canAdd ? 'button' : undefined}
                disabled={!canAdd}
                onPress={canAdd ? onPressEmptySlot : undefined}
                style={[
                  styles.emptyCell,
                  {
                    left: point.x,
                    top: point.y,
                    width: spec.cellWidth,
                    height: spec.cellHeight,
                    borderColor: theme.border,
                  },
                ]}
              >
                <ThemedText
                  selectable={false}
                  style={[styles.ghost, { color: canAdd ? theme.amber : theme.border }]}
                >
                  {canAdd ? '＋' : '?'}
                </ThemedText>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

type SheetCutProps = {
  clip: Clip;
  /** Slot the cut occupies when it mounts (its committed roll order). */
  initialIndex: number;
  /** 1-based badge following the displayed order. */
  number: number;
  mode: CutSheetMode;
  selected: boolean;
  canEdit: boolean;
  spec: ReorderGridSpec;
  slotCount: number;
  orderShared: SharedValue<string[]>;
  reducedMotion: boolean;
  onPress: (clip: Clip, index: number) => void;
  onLongPress: (clip: Clip) => void;
  onLift: () => void;
  onSettle: () => void;
  onOrderSync: (order: string[]) => void;
};

function SheetCut({
  clip,
  initialIndex,
  number,
  mode,
  selected,
  canEdit,
  spec,
  slotCount,
  orderShared,
  reducedMotion,
  onPress,
  onLongPress,
  onLift,
  onSettle,
  onOrderSync,
}: SheetCutProps) {
  const theme = useTheme();

  const initialPoint = slotPoint(initialIndex, spec);
  const active = useSharedValue(false);
  // Settled position — animated toward the cut's slot whenever the visual
  // order moves it while it is not the one being dragged.
  const x = useSharedValue(initialPoint.x);
  const y = useSharedValue(initialPoint.y);
  // Where the drag started and how far the finger has traveled since.
  const originX = useSharedValue(initialPoint.x);
  const originY = useSharedValue(initialPoint.y);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  useAnimatedReaction(
    () => orderShared.value.indexOf(clip.id),
    (index, previousIndex) => {
      if (index < 0 || index === previousIndex || active.value) return;
      const point = slotPoint(index, spec);
      if (reducedMotion) {
        x.value = point.x;
        y.value = point.y;
        return;
      }
      x.value = withSpring(point.x, SHUFFLE_SPRING);
      y.value = withSpring(point.y, SHUFFLE_SPRING);
    },
    [spec, reducedMotion],
  );

  // Built inline: GestureDetector reconciles the gesture on re-render and
  // updates the existing native handler in place, so the badge re-renders a
  // swap triggers never cancel an active drag. Only armed in reorder mode.
  const pan = buildDragGesture({
    clipId: clip.id,
    enabled: mode === 'reorder',
    spec,
    slotCount,
    reducedMotion,
    drag: { active, x, y, originX, originY, translationX, translationY, orderShared },
    onLift,
    onSettle,
    onOrderSync,
  });

  const animatedStyle = useAnimatedStyle(() => {
    const lifted = active.value;
    return {
      zIndex: lifted ? 10 : 0,
      transform: [
        { translateX: lifted ? originX.value + translationX.value : x.value },
        { translateY: lifted ? originY.value + translationY.value : y.value },
        {
          scale: reducedMotion ? 1 : withTiming(lifted ? 1.07 : 1, { duration: LIFT_MS }),
        },
      ],
    };
  });

  const mood = clip.mood ? ` · ${getCaptureMoodLabel(clip.mood)}` : '';
  const accessibilityHint =
    mode === 'view'
      ? '컷 원본을 재생해요'
      : mode === 'select'
        ? '선택을 켜거나 꺼요'
        : '길게 누른 뒤 끌어서 순서를 바꿔요';
  const showSelection = mode === 'select';

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.cell, { width: spec.cellWidth, height: spec.cellHeight }, animatedStyle]}
      >
        <Pressable
          accessibilityHint={accessibilityHint}
          accessibilityLabel={`${number}번째 컷 · ${clip.durationSec}초${mood}`}
          accessibilityRole={showSelection ? 'checkbox' : 'button'}
          accessibilityState={{ checked: showSelection ? selected : undefined }}
          disabled={mode === 'reorder'}
          onPress={() => onPress(clip, number - 1)}
          onLongPress={canEdit && mode === 'view' ? () => onLongPress(clip) : undefined}
          delayLongPress={260}
          style={[
            styles.frame,
            {
              backgroundColor: theme.film,
              borderColor: showSelection && selected ? theme.primary : theme.border,
            },
            showSelection && selected && styles.frameSelected,
          ]}
        >
          <NegativeFrame uri={clip.uri} />
          <ThemedText type="edge" themeColor="amber" style={styles.frameIndex}>
            {String(number).padStart(2, '0')}
          </ThemedText>
          <ThemedText type="edge" themeColor="textSecondary" style={styles.frameMeta}>
            {clip.durationSec}s
          </ThemedText>

          {showSelection ? (
            <View
              style={[
                styles.check,
                selected
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: 'rgba(14,11,8,0.5)', borderColor: 'rgba(255,255,255,0.85)' },
              ]}
            >
              {selected ? (
                <ThemedText
                  selectable={false}
                  style={[styles.checkMark, { color: theme.onPrimary }]}
                >
                  ✓
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

/** The shared values one cut's drag reads and writes on the UI thread. */
type DragValues = {
  active: SharedValue<boolean>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  translationX: SharedValue<number>;
  translationY: SharedValue<number>;
  orderShared: SharedValue<string[]>;
};

type DragGestureInput = {
  clipId: string;
  enabled: boolean;
  spec: ReorderGridSpec;
  slotCount: number;
  reducedMotion: boolean;
  drag: DragValues;
  onLift: () => void;
  onSettle: () => void;
  onOrderSync: (order: string[]) => void;
};

/**
 * The long-press-then-drag gesture for one cut. Its callbacks are worklets:
 * they run on the UI thread and only ever touch shared values, so the render
 * never blocks on a drag frame.
 */
function buildDragGesture({
  clipId,
  enabled,
  spec,
  slotCount,
  reducedMotion,
  drag,
  onLift,
  onSettle,
  onOrderSync,
}: DragGestureInput) {
  return Gesture.Pan()
    .enabled(enabled)
    .activateAfterLongPress(LIFT_AFTER_MS)
    .onStart(() => {
      const point = slotPoint(drag.orderShared.value.indexOf(clipId), spec);
      drag.originX.value = point.x;
      drag.originY.value = point.y;
      drag.translationX.value = 0;
      drag.translationY.value = 0;
      drag.active.value = true;
      runOnJS(onLift)();
    })
    .onUpdate((event) => {
      drag.translationX.value = event.translationX;
      drag.translationY.value = event.translationY;
      const centerX = drag.originX.value + event.translationX + spec.cellWidth / 2;
      const centerY = drag.originY.value + event.translationY + spec.cellHeight / 2;
      const from = drag.orderShared.value.indexOf(clipId);
      const to = slotIndexAtPoint(centerX, centerY, spec, slotCount);
      if (to !== from) {
        const next = movedOrder(drag.orderShared.value, clipId, to);
        drag.orderShared.value = next;
        runOnJS(onOrderSync)(next);
      }
    })
    .onFinalize(() => {
      if (!drag.active.value) return;
      // Land where the finger let go, then spring into the final slot.
      const point = slotPoint(drag.orderShared.value.indexOf(clipId), spec);
      drag.x.value = drag.originX.value + drag.translationX.value;
      drag.y.value = drag.originY.value + drag.translationY.value;
      drag.active.value = false;
      if (reducedMotion) {
        drag.x.value = point.x;
        drag.y.value = point.y;
      } else {
        drag.x.value = withSpring(point.x, SHUFFLE_SPRING);
        drag.y.value = withSpring(point.y, SHUFFLE_SPRING);
      }
      runOnJS(onSettle)();
    });
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  cell: { position: 'absolute', top: 0, left: 0 },
  // One standardized contact-sheet cell face, shared by filled and empty slots.
  frame: {
    flex: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  frameSelected: { borderWidth: 2 },
  frameIndex: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  frameMeta: { position: 'absolute', bottom: Spacing.two, right: Spacing.two },
  check: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 13, fontWeight: '800', lineHeight: 15 },
  emptyCell: {
    position: 'absolute',
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: { fontSize: 18, fontWeight: '700' },
});
