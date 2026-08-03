import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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

import {
  clampPx,
  minGapPx,
  secToX,
  windowSignature,
  xToSec,
  type TrimTrack,
} from '../model/trim-geometry';

/** Which end of the window a handle moves. */
type TrimEdge = 'start' | 'end';

type TrimHandles = {
  startX: SharedValue<number>;
  endX: SharedValue<number>;
  /** Where the dragged handle sat when the gesture began. */
  origin: SharedValue<number>;
  /** The window last reported to JS, so a drag crosses over on step changes only. */
  reported: SharedValue<number>;
};

const TrackHeight = 30;
const HandleWidth = 20;

/**
 * Builds the pan gesture for one handle.
 *
 * A module-level factory taking the shared values as arguments, rather than a
 * closure built in the component: the React Compiler lint rejects `.value` writes
 * inside gesture-builder callbacks defined in a component body, and this is the
 * project's established way around it (see
 * `docs/frameworks/animations-and-gestures.md`).
 *
 * `activeOffsetX`/`failOffsetY` are what let the handle live inside a vertical
 * scroll view: a sideways drag claims the gesture, and a vertical one hands the
 * touch back to the scroll.
 */
function buildTrimGesture(
  handles: TrimHandles,
  edge: TrimEdge,
  track: TrimTrack,
  enabled: boolean,
  report: (startSec: number, endSec: number, settled: boolean) => void,
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

  return (
    Gesture.Pan()
      .enabled(enabled)
      .minDistance(0)
      .activeOffsetX([-4, 4])
      .failOffsetY([-16, 16])
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
      // cancelled — the scroll view claiming the touch, say — which would otherwise
      // leave the handle moved and the window never committed.
      .onFinalize(() => publish(true))
  );
}

export type TrimBarProps = {
  /** Length of the snap behind this cut. */
  durationSec: number;
  /** Current window, in seconds from the start of the snap. */
  startSec: number;
  endSec: number;
  /** Track width in points, derived by the page rather than measured. */
  width: number;
  /** False once a job owns the movie — the bar stays drawn but stops responding. */
  canEdit: boolean;
  /** Called with a settled window; the cut list holds it locally until a save. */
  onChange: (startSec: number, endSec: number) => void;
};

/**
 * The cut's length, dragged.
 *
 * Two handles over the snap's whole duration. The handles follow the finger on the
 * UI thread; the numbers under them come from React state that only moves when the
 * window crosses a half-second boundary, and the committed value is reported once
 * the gesture settles. That split is the rule in
 * `docs/frameworks/animations-and-gestures.md`: per-frame position stays in shared
 * values, and JS hears about meaningful boundaries.
 *
 * The window's own rules — the granularity, the minimum length, and dropping a
 * full-width window back to "plays whole" — belong to `entities/movie` and are
 * applied by the cut list when it takes the reported value.
 */
export function TrimBar({ durationSec, startSec, endSec, width, canEdit, onChange }: TrimBarProps) {
  const theme = useTheme();
  const track: TrimTrack = { width, durationSec, stepSec: CutTrimStepSec };

  const startX = useSharedValue(secToX(startSec, track));
  const endX = useSharedValue(secToX(endSec, track));
  const origin = useSharedValue(0);
  const reported = useSharedValue(windowSignature(startSec, endSec));
  const handles: TrimHandles = { startX, endX, origin, reported };

  // Live numbers while a handle is down; the props are the truth otherwise.
  const [dragged, setDragged] = useState<{ startSec: number; endSec: number }>();
  const shown = dragged ?? { startSec, endSec };

  // Follow the stored window whenever it moves for a reason other than this drag
  // — a save landing, 되돌리기, or the whole-snap reset.
  useEffect(() => {
    startX.value = secToX(startSec, track);
    endX.value = secToX(endSec, track);
    reported.value = windowSignature(startSec, endSec);
    // `track` is rebuilt every render; its three values are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSec, endSec, durationSec, width, startX, endX, reported]);

  const report = (nextStart: number, nextEnd: number, settled: boolean) => {
    if (!settled) {
      setDragged({ startSec: nextStart, endSec: nextEnd });
      return;
    }
    setDragged(undefined);
    onChange(nextStart, nextEnd);
  };

  const windowStyle = useAnimatedStyle(() => ({
    left: startX.value,
    width: Math.max(endX.value - startX.value, 0),
  }));
  const startStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: startX.value - HandleWidth / 2 }],
  }));
  const endStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: endX.value - HandleWidth / 2 }],
  }));

  return (
    <View style={styles.bar}>
      <View
        style={[styles.track, { width, backgroundColor: theme.media, borderColor: theme.border }]}
      >
        <Animated.View
          style={[styles.window, windowStyle, { backgroundColor: theme.backgroundSelected }]}
        />
        <GestureDetector gesture={buildTrimGesture(handles, 'start', track, canEdit, report)}>
          <Animated.View
            accessibilityRole="adjustable"
            accessibilityLabel="컷 시작 지점"
            accessibilityValue={{ text: formatSeconds(shown.startSec) }}
            style={[styles.handle, startStyle, { backgroundColor: theme.primary }]}
          />
        </GestureDetector>
        <GestureDetector gesture={buildTrimGesture(handles, 'end', track, canEdit, report)}>
          <Animated.View
            accessibilityRole="adjustable"
            accessibilityLabel="컷 끝 지점"
            accessibilityValue={{ text: formatSeconds(shown.endSec) }}
            style={[styles.handle, endStyle, { backgroundColor: theme.primary }]}
          />
        </GestureDetector>
      </View>

      <ThemedText type="edge" themeColor="textSecondary">
        {formatSeconds(shown.startSec)} → {formatSeconds(shown.endSec)} · 사용{' '}
        {formatSeconds(shown.endSec - shown.startSec)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { gap: Spacing.one },
  track: {
    height: TrackHeight,
    borderWidth: 1,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  window: { position: 'absolute', top: 0, bottom: 0 },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: HandleWidth,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
});
