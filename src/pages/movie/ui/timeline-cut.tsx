import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { CutTrimStepSec, MinCutSec } from '@/entities/movie';
import { formatSeconds } from '@/shared/lib/datetime';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoFrame } from '@/shared/ui/video-frame';

import {
  clampPx,
  minGapPx,
  secToX,
  windowSignature,
  xToSec,
  type TrimTrack,
} from '../model/trim-geometry';
import type { Cut } from '../model/use-movie-cuts';

/** The strip's clip height; the thumbnail tiles are squares of the same size. */
export const TimelineCutHeight = 56;
const TileWidth = TimelineCutHeight;
const HandleWidth = 18;

/** Which end of the trim window a handle moves. */
type TrimEdge = 'start' | 'end';

type TrimHandles = {
  startX: SharedValue<number>;
  endX: SharedValue<number>;
  /** Where the dragged handle sat when the gesture began. */
  origin: SharedValue<number>;
  /** The window last reported to JS, so a drag crosses over on step changes only. */
  reported: SharedValue<number>;
};

/**
 * Builds the pan gesture for one trim handle.
 *
 * A module-level factory taking the shared values as arguments, rather than a
 * closure built in the component: the React Compiler lint rejects `.value`
 * writes inside gesture-builder callbacks defined in a component body, and this
 * is the project's established way around it (see
 * `docs/frameworks/animations-and-gestures.md`).
 *
 * The handle lives inside the strip's *horizontal* scroll, where offset-based
 * arbitration cannot separate the two — both want the same axis. Instead the
 * touch going down on a handle locks the scroll (`setTrimming`) before either
 * gesture can move, so the pan always wins on a handle and the strip scrolls
 * everywhere else; `onFinalize` unlocks even when the gesture is cancelled.
 */
function buildTrimGesture(
  handles: TrimHandles,
  edge: TrimEdge,
  track: TrimTrack,
  report: (startSec: number, endSec: number, settled: boolean) => void,
  setTrimming: (trimming: boolean) => void,
) {
  const moving = edge === 'start' ? handles.startX : handles.endX;
  const gap = minGapPx(MinCutSec, track);

  const publish = (settled: boolean) => {
    'worklet';
    const startSec = xToSec(handles.startX.value, track);
    const endSec = xToSec(handles.endX.value, track);
    const signature = windowSignature(startSec, endSec);
    if (!settled && signature === handles.reported.value) return;
    handles.reported.value = signature;
    runOnJS(report)(startSec, endSec, settled);
  };

  return Gesture.Pan()
    .minDistance(0)
    .onTouchesDown(() => {
      runOnJS(setTrimming)(true);
    })
    .onStart(() => {
      handles.origin.value = moving.value;
    })
    .onUpdate((event) => {
      const min = edge === 'start' ? 0 : handles.startX.value + gap;
      const max = edge === 'start' ? handles.endX.value - gap : track.width;
      moving.value = clampPx(handles.origin.value + event.translationX, min, max);
      publish(false);
    })
    // `onFinalize` rather than `onEnd`: it also runs when the gesture is
    // cancelled, which must still commit the window and hand the scroll back.
    .onFinalize(() => {
      publish(true);
      runOnJS(setTrimming)(false);
    });
}

export type TimelineCutProps = {
  cut: Cut;
  index: number;
  selected: boolean;
  /**
   * True when this cut is being trimmed in place: selected, editable, and its
   * original alive. The clip widens to the whole snap and grows handles. Must
   * agree with the `width` the strip's metrics computed.
   */
  expanded: boolean;
  /** Width this cut occupies in the strip, from the shared layout metrics. */
  width: number;
  pxPerSec: number;
  onSelect: (index: number) => void;
  /** Called with a settled trim window; the cut list holds it until a save. */
  onTrim: (index: number, startSec: number, endSec: number) => void;
  /** Reported while a handle is down, so the strip can lock its scroll. */
  onTrimmingChange: (trimming: boolean) => void;
};

/**
 * One cut in the timeline strip, drawn as long as it plays.
 *
 * The clip's width is its duration on the strip's seconds scale, filled with
 * repeating thumbnail tiles like a reel. A collapsed clip shows only its trim
 * window (the reel slides left by the trimmed-off lead); the expanded clip —
 * the selected one, while editable — shows the *whole* snap with the window
 * framed on top of it, so trimming is dragging the frame's edges over footage
 * that stays put, and footage outside the window is visible (dimmed) rather
 * than gone. That is what makes the trim live on the timeline itself instead
 * of on a separate bar.
 *
 * The handles follow the finger on the UI thread; React state only hears about
 * half-second boundary crossings (for the duration badge) and the settled
 * window (per `docs/frameworks/animations-and-gestures.md`).
 */
export function TimelineCut({
  cut,
  index,
  selected,
  expanded,
  width,
  pxPerSec,
  onSelect,
  onTrim,
  onTrimmingChange,
}: TimelineCutProps) {
  const theme = useTheme();
  const snap = cut.snap;
  const missing = snap === undefined;
  const durationSec = snap?.durationSec ?? 0;
  /** The full snap's width — what the tiles fill and the trim drags along. */
  const reelWidth = snap ? durationSec * pxPerSec : width;
  const track: TrimTrack = { width: reelWidth, durationSec, stepSec: CutTrimStepSec };
  const startSec = cut.ref.trim?.startSec ?? 0;
  const endSec = cut.ref.trim?.endSec ?? durationSec;

  const startX = useSharedValue(secToX(startSec, track));
  const endX = useSharedValue(secToX(endSec, track));
  const origin = useSharedValue(0);
  const reported = useSharedValue(windowSignature(startSec, endSec));
  const handles: TrimHandles = { startX, endX, origin, reported };

  // Follow the stored window whenever it moves for a reason other than this
  // drag — a save landing, 되돌리기, or the whole-snap reset.
  useEffect(() => {
    startX.value = secToX(startSec, track);
    endX.value = secToX(endSec, track);
    reported.value = windowSignature(startSec, endSec);
    // `track` is rebuilt every render; its real inputs are listed instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSec, endSec, durationSec, reelWidth, startX, endX, reported]);

  // Live numbers while a handle is down; the props are the truth otherwise.
  const [dragged, setDragged] = useState<{ startSec: number; endSec: number }>();
  const shown = dragged ?? { startSec, endSec };

  const report = (nextStart: number, nextEnd: number, settled: boolean) => {
    if (!settled) {
      setDragged({ startSec: nextStart, endSec: nextEnd });
      return;
    }
    setDragged(undefined);
    onTrim(index, nextStart, nextEnd);
  };

  const leftDimStyle = useAnimatedStyle(() => ({ width: startX.value }));
  const rightDimStyle = useAnimatedStyle(() => ({ left: endX.value }));
  const frameStyle = useAnimatedStyle(() => ({
    left: startX.value,
    width: Math.max(endX.value - startX.value, 0),
  }));
  const startHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: startX.value }],
  }));
  const endHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: endX.value - HandleWidth }],
  }));

  const tileCount = Math.max(Math.ceil(reelWidth / TileWidth), 1);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`컷 ${index + 1}${missing ? ' · 원본 삭제됨' : ''} · ${formatSeconds(shown.endSec - shown.startSec)}`}
      accessibilityState={{ selected }}
      onPress={() => onSelect(index)}
      style={[
        styles.clip,
        {
          width,
          backgroundColor: theme.media,
          borderColor: missing ? theme.danger : selected && !expanded ? theme.amber : theme.border,
          borderWidth: missing || (selected && !expanded) ? 2 : 1,
        },
      ]}
    >
      {snap ? (
        <View
          style={[
            styles.reel,
            { width: reelWidth },
            // A collapsed clip shows only its window: the reel slides left by
            // the trimmed-off lead and the clip's width crops the rest.
            expanded ? null : { transform: [{ translateX: -secToX(startSec, track) }] },
          ]}
        >
          {Array.from({ length: tileCount }, (_, tile) => (
            <View key={tile} style={styles.tile}>
              <VideoFrame uri={snap.uri} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.missingMark}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
        </View>
      )}

      {expanded ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.dim, styles.dimLeft, leftDimStyle]} />
          <Animated.View
            pointerEvents="none"
            style={[styles.dim, styles.dimRight, rightDimStyle]}
          />
          <Animated.View
            pointerEvents="none"
            style={[styles.windowFrame, { borderColor: theme.amber }, frameStyle]}
          />
        </>
      ) : null}

      <View style={styles.badges} pointerEvents="none">
        <ThemedText selectable={false} style={styles.number}>
          {index + 1}
        </ThemedText>
        <ThemedText selectable={false} style={styles.duration}>
          {formatSeconds(shown.endSec - shown.startSec)}
        </ThemedText>
      </View>

      {expanded ? (
        <>
          <GestureDetector
            gesture={buildTrimGesture(handles, 'start', track, report, onTrimmingChange)}
          >
            <Animated.View
              accessibilityRole="adjustable"
              accessibilityLabel="컷 시작 지점"
              accessibilityValue={{ text: formatSeconds(shown.startSec) }}
              style={[
                styles.handle,
                styles.handleStart,
                { backgroundColor: theme.amber },
                startHandleStyle,
              ]}
            >
              <View style={styles.grip} />
            </Animated.View>
          </GestureDetector>
          <GestureDetector
            gesture={buildTrimGesture(handles, 'end', track, report, onTrimmingChange)}
          >
            <Animated.View
              accessibilityRole="adjustable"
              accessibilityLabel="컷 끝 지점"
              accessibilityValue={{ text: formatSeconds(shown.endSec) }}
              style={[
                styles.handle,
                styles.handleEnd,
                { backgroundColor: theme.amber },
                endHandleStyle,
              ]}
            >
              <View style={styles.grip} />
            </Animated.View>
          </GestureDetector>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clip: {
    height: TimelineCutHeight,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  reel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  tile: { width: TileWidth, height: '100%' },
  missingMark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed black over arbitrary video, like the badge shadows, rather than a
  // palette color.
  dim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dimLeft: { left: 0 },
  dimRight: { right: 0 },
  windowFrame: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: HandleWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleStart: {
    borderTopLeftRadius: Radius.small,
    borderBottomLeftRadius: Radius.small,
  },
  handleEnd: {
    borderTopRightRadius: Radius.small,
    borderBottomRightRadius: Radius.small,
  },
  grip: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
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
});
