import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { RollTint } from '@/entities/roll';
import { Radius, Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

/** Something the strip needs to say after an action, and how it went. */
export type StripNotice = {
  /** `done` confirms a write; `warn` reports one that was refused. */
  tone: 'done' | 'warn';
  message: string;
  /** The roll the message is about, so the card carries that roll's color. */
  tint?: RollTint;
};

type CutNoticeProps = {
  notice: StripNotice | undefined;
};

/**
 * The one-line report the strip gives after a collect action.
 *
 * A confirmation snaps in with the release easing the app uses when something
 * is let go of (concept §7): bundling cuts into a roll is the moment they stop
 * being loose, and the card is what says so on a screen that has no cover to
 * show yet. A refusal simply appears — overshooting into bad news reads wrong.
 *
 * Mount-time animation uses a shared value rather than an `entering` preset,
 * which never starts on iOS in Expo Go (see `shared/ui/fade-in-view`).
 */
export function CutNotice({ notice }: CutNoticeProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(1);

  const isDone = notice?.tone === 'done';
  const accent = notice?.tint ?? (isDone ? theme.lumen : theme.amber);

  useEffect(() => {
    if (!notice || !isDone || reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.back(1.7)) });
  }, [notice, isDone, reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  if (!notice) return null;

  return (
    <Animated.View style={animatedStyle}>
      <View style={[styles.card, { borderColor: accent }]}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <ThemedText type="smallBold" style={{ color: accent }}>
          {notice.message}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.four,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
