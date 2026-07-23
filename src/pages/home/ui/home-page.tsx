import { Link } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useRolls, useTodayRoll } from '@/entities/roll';
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
import { formatReelLength, useDevelopedRolls } from '@/widgets/developed-rolls-shelf';

// A daily roll shows its captures against a soft target of empty frames so the
// gaps invite more collecting (concept §4, "빈칸을 보여준다"). This is a display
// target, not a hard capacity — the "all-day" rule keeps accepting clips.
const ROLL_SIZE = 12;

// Contact-sheet preview holds up to this many frames on Home; the full grid
// lives on the roll-detail screen.
const PREVIEW_SLOTS = 6;

// The home shelf teases the most recent developed rolls; the full shelf is in
// the archive. Cover tints are cycled by position — rolls carry no color yet.
const SHELF_PREVIEW = 2;
const COVER_TINTS = ['#7A3F2A', '#1F5F5B', '#5A4718', '#3E2C5A', '#245A3E'];

export function HomePage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const todayRoll = useTodayRoll();
  const rolls = useRolls();
  const developedRolls = useDevelopedRolls();
  const captured = todayRoll?.clipRefs.length ?? 0;
  const filledPreview = Math.min(captured, PREVIEW_SLOTS);
  const emptyPreview = Math.max(PREVIEW_SLOTS - filledPreview, 0);
  const rollDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // The roll's real ordinal among daily rolls, so the edge print is honest
  // rather than a fixed mock number.
  const rollNumber = useMemo(() => {
    if (!todayRoll) return undefined;
    const index = rolls
      .filter((roll) => roll.type === 'daily')
      .sort((left, right) => left.createdAt - right.createdAt)
      .findIndex((roll) => roll.id === todayRoll.id);
    return index >= 0 ? index + 1 : undefined;
  }, [rolls, todayRoll]);

  const shelfPreview = developedRolls.slice(0, SHELF_PREVIEW);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Spacing.six + topInset,
          paddingBottom: Spacing.seven + tabBarHeight,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="edge" themeColor="amber">
          {rollNumber ? `ROLL ${String(rollNumber).padStart(3, '0')} · ` : ''}
          {rollDate}
        </ThemedText>
        <View style={styles.titleRow}>
          <ThemedText type="title">오늘의 롤</ThemedText>
          <ThemedText type="edge" themeColor="primary">
            {String(captured).padStart(2, '0')}/{ROLL_SIZE} · 미현상
          </ThemedText>
        </View>
      </View>

      {/* Contact sheet — undeveloped negatives for the day's real clips, then
          the empty slots that invite more captures. The whole strip lives on a
          film-black base and opens the full roll. Capture itself is the center
          safelight button in the tab bar (concept §6), so Home no longer holds
          its own capture ring. */}
      <Link
        accessibilityLabel="오늘의 롤 열기"
        href={{ pathname: '/roll/[id]', params: { id: todayRoll?.id ?? '' } }}
        asChild
        disabled={!todayRoll}
      >
        <Pressable accessibilityRole="button">
          <FadeInView duration={420} style={[styles.filmStrip, { backgroundColor: theme.film }]}>
            <View style={styles.perf}>
              {Array.from({ length: 9 }).map((_, index) => (
                <View key={index} style={[styles.perfHole, { backgroundColor: theme.background }]} />
              ))}
            </View>
            <View style={styles.frameRow}>
              {Array.from({ length: filledPreview }).map((_, index) => (
                <View
                  key={`clip-${index}`}
                  style={[
                    styles.frameWindow,
                    { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 },
                  ]}
                >
                  <ThemedText selectable={false} type="edge" themeColor="amber">
                    {String(index + 1).padStart(2, '0')}
                  </ThemedText>
                </View>
              ))}
              {Array.from({ length: emptyPreview }).map((_, index) => (
                <View
                  key={`empty-${index}`}
                  style={[styles.frameEmpty, { borderColor: theme.border }]}
                >
                  <ThemedText selectable={false} style={[styles.frameGhost, { color: theme.border }]}>
                    ?
                  </ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.perf}>
              {Array.from({ length: 9 }).map((_, index) => (
                <View key={index} style={[styles.perfHole, { backgroundColor: theme.background }]} />
              ))}
            </View>
          </FadeInView>
        </Pressable>
      </Link>

      {/* Delayed develop — the day's roll stays undeveloped until it ends. This
          is the anticipation the whole home leans on now that capture moved to
          the tab bar. */}
      <View
        style={[
          styles.developCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <View style={[styles.glow, { backgroundColor: theme.primary }]} />
        <View style={styles.developCopy}>
          <ThemedText type="edge" themeColor="lumen">
            DARKROOM · 대기 중
          </ThemedText>
          <ThemedText type="heading">하루가 끝나면 현상해요</ThemedText>
          <ThemedText themeColor="textSecondary">
            담은 순간은 어둠 속에 모입니다. 아직은 완성본을 보여주지 않아요 — 하루가 끝나면 필름을
            현상하듯 하나의 릴로 엮어 처음으로 공개됩니다.
          </ThemedText>
        </View>
        <View style={styles.developMeta}>
          <ThemedText type="edge" themeColor="amber">
            {captured}컷 · 예상 릴 {formatReelLength(captured * 5)}
          </ThemedText>
        </View>
      </View>

      {/* Shelf preview — developed rolls stand like spines; the empty slot pulls
          for the next one. Real developed rolls now (concept §6, "선반 미리보기"). */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="heading">선반</ThemedText>
          <Link href="/archive" style={styles.moreLink}>
            <ThemedText type="edge" themeColor="lumen">
              보관함 →
            </ThemedText>
          </Link>
        </View>
        <View style={styles.shelfRow}>
          {shelfPreview.map((roll, index) => (
            <Link
              key={roll.id}
              href={{ pathname: '/capture/result', params: { rollId: roll.id } }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${roll.title} 릴 재생`}
                style={StyleSheet.flatten([
                  styles.spine,
                  { backgroundColor: COVER_TINTS[index % COVER_TINTS.length] },
                ])}
              >
                <ThemedText selectable={false} style={styles.spineNum}>
                  {roll.dayKey ?? '롤'} · {formatReelLength(roll.totalSec)}
                </ThemedText>
                <ThemedText selectable={false} style={styles.spineTitle} numberOfLines={1}>
                  {roll.title}
                </ThemedText>
              </Pressable>
            </Link>
          ))}
          {/* An empty slot always trails the shelf — the invitation to fill it. */}
          <View style={[styles.spineEmpty, { borderColor: theme.border }]}>
            <ThemedText type="edge" themeColor="textSecondary">
              {shelfPreview.length === 0 ? '첫 롤' : '빈 롤'}
            </ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.six,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  filmStrip: {
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  perf: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.two,
  },
  perfHole: { width: 14, height: 8, borderRadius: 2 },
  frameRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  frameWindow: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 4,
    borderCurve: 'continuous',
    padding: Spacing.two,
    alignItems: 'flex-end',
  },
  frameEmpty: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameGhost: { fontSize: 18, fontWeight: '700' },
  developCard: {
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.four,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -90,
    top: -110,
    opacity: 0.16,
  },
  developCopy: { gap: Spacing.two },
  developMeta: { flexDirection: 'row' },
  section: { gap: Spacing.four },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moreLink: {},
  shelfRow: { flexDirection: 'row', gap: Spacing.three },
  spine: {
    flex: 1,
    height: 118,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    padding: Spacing.three,
    justifyContent: 'flex-end',
    gap: Spacing.half,
  },
  spineNum: {
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  spineTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  spineEmpty: {
    flex: 1,
    height: 118,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
