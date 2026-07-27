import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useClips } from '@/entities/clip';
import { FadeInView } from '@/shared/ui/fade-in-view';
import {
  MaxContentWidth,
  Radius,
  Spacing,
  useTabBarHeight,
  useTheme,
  useTopContentInset,
} from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { useClipMembership } from '@/widgets/clip-membership';
import { useDevelopedRollMonths, useRollsAwaitingDevelop } from '@/widgets/roll-shelf';

import { PendingRollCard } from './pending-roll-card';
import { RollCover } from './roll-cover';

/**
 * The film cabinet.
 *
 * One scroll, read top to bottom as anticipation → what you own → raw material:
 * the rolls still waiting to be developed, then the developed shelf split by
 * month, then the drawer holding every original cut. The 컷/롤 segmented control
 * is gone — asking which of the two the user wants to see was the wrong
 * question, since the answer is almost always the rolls.
 *
 * The drawer counts clips, not files on disk — the same source the strip behind
 * it reads, so the number on the drawer is the number of frames inside it.
 */
export function ArchivePage() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const awaitingRolls = useRollsAwaitingDevelop();
  const developedMonths = useDevelopedRollMonths();
  const clipMembership = useClipMembership();
  const clips = useClips();

  const developedCount = developedMonths.reduce((sum, month) => sum + month.rolls.length, 0);
  // A cut no roll references at all — the drawer surfaces these because they
  // are the ones with nothing holding them.
  const looseCutCount = clips.filter((clip) => !clipMembership.has(clip.id)).length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Spacing.six + topInset, paddingBottom: Spacing.six + tabBarHeight },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="edge" themeColor="amber">
          CABINET · 롤 {developedCount} · 컷 {clips.length}
        </ThemedText>
        {/* Settings tucked into the archive corner — no longer a tab (concept §6). */}
        <View style={styles.titleRow}>
          <ThemedText type="title">보관함</ThemedText>
          <Link href="/settings" asChild>
            <Pressable
              accessibilityLabel="설정"
              accessibilityRole="button"
              hitSlop={12}
              style={styles.settingsButton}
            >
              <Ionicons color={theme.textSecondary} name="settings-outline" size={22} />
            </Pressable>
          </Link>
        </View>
        <ThemedText themeColor="textSecondary">
          현상을 기다리는 롤이 위에, 현상을 마친 롤은 아래 선반에 꽂혀요.
        </ThemedText>
      </View>

      <FadeInView duration={260} style={styles.lanes}>
        {/* Today's roll is always here, so this lane never stands empty. */}
        <View style={styles.lane}>
          <View style={styles.laneHead}>
            <ThemedText type="edge" themeColor="primary">
              ● 현상 대기 {awaitingRolls.length}
            </ThemedText>
          </View>
          {awaitingRolls.map((roll) => (
            <PendingRollCard
              key={roll.id}
              roll={roll}
              onPress={() => router.push({ pathname: '/roll/[id]', params: { id: roll.id } })}
              onDevelop={() =>
                router.push({ pathname: '/capture/editing', params: { rollId: roll.id } })
              }
              onCollect={() => router.push('/capture')}
            />
          ))}
        </View>

        {developedMonths.map((month) => (
          <View key={month.key} style={styles.lane}>
            <View style={styles.laneHead}>
              <ThemedText type="edge" themeColor="lumen">
                ◐ 현상 완료 · {month.label}
              </ThemedText>
              <ThemedText type="edge" themeColor="textSecondary">
                {month.rolls.length}롤
              </ThemedText>
            </View>
            <View style={styles.coverGrid}>
              {month.rolls.map((roll) => (
                <RollCover
                  key={roll.id}
                  roll={roll}
                  onPress={() =>
                    router.push({ pathname: '/capture/result', params: { rollId: roll.id } })
                  }
                />
              ))}
              {/* The gaps are part of the collection: days that passed with
                  nothing kept. A real count, not a decorative slot. */}
              {month.emptyDayCount > 0 ? (
                <View style={[styles.emptyDays, { borderColor: theme.border }]}>
                  <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                    {month.emptyDayCount}일
                  </ThemedText>
                  <ThemedText selectable={false} type="edge" themeColor="textSecondary">
                    비었음
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        ))}

        {developedMonths.length === 0 ? (
          <View style={styles.lane}>
            <View style={styles.laneHead}>
              <ThemedText type="edge" themeColor="lumen">
                ◐ 현상 완료
              </ThemedText>
            </View>
            <View style={[styles.emptyShelf, { borderColor: theme.border }]}>
              <ThemedText type="heading">선반이 비어 있어요</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                오늘의 롤을 현상하면 이 선반에 릴로 꽂혀요.
              </ThemedText>
            </View>
          </View>
        ) : null}

        <Link href="/cuts" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="모든 컷 열기"
            accessibilityHint={`${clips.length}개의 원본 컷을 봐요`}
            // The direct child of `<Link asChild>` must carry a single flattened
            // style — expo-router's Slot cannot merge its own style into an array
            // and throws in development instead.
            style={StyleSheet.flatten([styles.drawer, { borderTopColor: theme.border }])}
          >
            <View style={styles.drawerText}>
              <ThemedText type="smallBold">모든 컷</ThemedText>
              <ThemedText type="edge" themeColor="textSecondary">
                {clips.length}컷{looseCutCount > 0 ? ` · 롤 없는 컷 ${looseCutCount}` : ''}
              </ThemedText>
            </View>
            <ThemedText type="edge" themeColor="textSecondary">
              열기 ›
            </ThemedText>
          </Pressable>
        </Link>
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.five,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingsButton: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  lanes: { gap: Spacing.five },
  lane: { gap: Spacing.two },
  laneHead: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  coverGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  emptyDays: {
    width: '48%',
    height: 132,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  emptyShelf: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
  },
  centerText: { textAlign: 'center' },
  drawer: {
    minHeight: 56,
    borderTopWidth: 1,
    paddingTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  drawerText: { gap: Spacing.one },
});
