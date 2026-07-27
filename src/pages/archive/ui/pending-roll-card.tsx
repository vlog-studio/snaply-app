import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DailyRollTarget } from '@/entities/roll';
import { NegativeFrame } from '@/shared/ui/negative-frame';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { type RollSummary } from '@/widgets/roll-shelf';

/** How many frames the card's mini strip shows before it stops. */
const StripFrames = 5;

type PendingRollCardProps = {
  roll: RollSummary;
  /** Opens the roll's contact sheet. */
  onPress: () => void;
  /** Starts the develop ceremony; absent on today's roll. */
  onDevelop?: () => void;
  /** Opens capture; present only on today's roll. */
  onCollect?: () => void;
};

/**
 * A roll waiting in the cabinet's top lane.
 *
 * Two shapes, one card. Today's roll is amber safelight: it shows its cuts
 * against the remaining empty frames and a fill meter, and its action is to
 * capture more. A roll whose day is over is cool lumen and reads as ready — its
 * action is 현상하기, the moment the app has been withholding all day (concept
 * §4). Only the finished side gets the cold light; using it on a roll still
 * being filled would spend the develop moment early.
 *
 * Frames render as blurred negatives: nothing here is developed yet, so the
 * card must not reveal the moments it is holding.
 */
function PendingRollCardComponent({ roll, onPress, onDevelop, onCollect }: PendingRollCardProps) {
  const theme = useTheme();
  const isReady = !roll.isToday;
  const accent = isReady ? theme.lumen : theme.primary;
  const emptyFrames = roll.isToday
    ? Math.max(Math.min(StripFrames, DailyRollTarget) - roll.coverUris.length, 0)
    : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${roll.title} 열기`}
      accessibilityHint={
        isReady ? '현상을 기다리는 롤이에요' : `오늘 담은 ${roll.clipCount}컷을 볼 수 있어요`
      }
      onPress={onPress}
      style={[styles.card, { borderColor: accent, backgroundColor: theme.backgroundElement }]}
    >
      <View style={styles.headRow}>
        <ThemedText type="heading">
          {roll.isToday ? '오늘' : (roll.dayKey ?? roll.title)}
        </ThemedText>
        <View style={[styles.badge, { borderColor: accent }]}>
          <ThemedText selectable={false} type="edge" style={{ color: accent }}>
            {isReady ? '현상 준비됨' : `담는 중 ${roll.clipCount}/${DailyRollTarget}`}
          </ThemedText>
        </View>
      </View>

      <View style={styles.strip}>
        {roll.coverUris.slice(0, StripFrames).map((uri) => (
          <View key={uri} style={[styles.frame, { borderColor: theme.border }]}>
            <NegativeFrame uri={uri} />
          </View>
        ))}
        {Array.from({ length: emptyFrames }, (_, index) => (
          <View key={`empty-${index}`} style={[styles.frameEmpty, { borderColor: theme.border }]} />
        ))}
      </View>

      {roll.isToday ? (
        <View style={[styles.meter, { backgroundColor: theme.background }]}>
          <View
            style={[
              styles.meterFill,
              {
                backgroundColor: accent,
                width: `${Math.min((roll.clipCount / DailyRollTarget) * 100, 100)}%`,
              },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.footRow}>
        <ThemedText type="edge" themeColor="textSecondary">
          {isReady
            ? `${roll.clipCount}컷 · 하루 종료`
            : roll.clipCount === 0
              ? '첫 컷을 기다리는 롤'
              : '자정 이후 현상 열림'}
        </ThemedText>
        {isReady ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${roll.title} 현상하기`}
            onPress={onDevelop}
            style={[styles.action, { backgroundColor: accent }]}
          >
            <ThemedText selectable={false} style={[styles.actionText, { color: theme.media }]}>
              현상하기
            </ThemedText>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="순간 담기"
            onPress={onCollect}
            style={[styles.action, styles.actionGhost, { borderColor: theme.border }]}
          >
            <ThemedText selectable={false} style={[styles.actionText, { color: theme.text }]}>
              {roll.clipCount === 0 ? '첫 순간 담기' : '담기'}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

export const PendingRollCard = memo(PendingRollCardComponent);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  strip: { flexDirection: 'row', gap: Spacing.one },
  frame: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  frameEmpty: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  meter: { height: 3, borderRadius: 2, overflow: 'hidden' },
  meterFill: { height: '100%' },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  action: {
    minHeight: 36,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '800', letterSpacing: -0.1 },
});
