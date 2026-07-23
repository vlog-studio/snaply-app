import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTodayRoll } from '@/entities/roll';
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

// The "n/총" counter and develop-card clip count are bound to today's real roll
// (via useTodayRoll). The contact-sheet frames and shelf below are still
// prototype fixtures until the full home binding (contact sheet thumbnails,
// shelf) lands as its own milestone.
const ROLL_SIZE = 12;

// Contact-sheet preview holds up to this many frames on Home; the full grid
// lives on the roll-detail screen.
const PREVIEW_SLOTS = 6;

const shelf = [
  { id: 'R018', title: '성수동 오후', tint: '#7A3F2A' },
  { id: 'R017', title: '한강 노을', tint: '#1F5F5B' },
];

export function HomePage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const todayRoll = useTodayRoll();
  const captured = todayRoll?.clipRefs.length ?? 0;
  const filledPreview = Math.min(captured, PREVIEW_SLOTS);
  const emptyPreview = Math.max(PREVIEW_SLOTS - filledPreview, 0);
  const rollDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

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
          ROLL 019 · {rollDate}
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
          film-black base and opens the full roll. */}
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

      {/* The safelight — capture is a single amber tap, everything else recedes. */}
      <View style={styles.captureBlock}>
        <Link
          accessibilityLabel="담기"
          href={{ pathname: '/capture', params: { context: 'cafe' } }}
          style={styles.captureLink}
        >
          <View style={styles.ringOuter}>
            <View style={[styles.ringTrack, { borderColor: theme.border }]} />
            <View style={[styles.ringCore, { backgroundColor: theme.primary }]} />
          </View>
        </Link>
        <ThemedText type="edge" themeColor="textSecondary" style={styles.captureHint}>
          꾹 눌러 담기
        </ThemedText>
      </View>

      {/* Delayed develop — the day's roll stays undeveloped until it ends. */}
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
            {captured}컷 · 예상 릴 0:{String(captured * 5).padStart(2, '0')}
          </ThemedText>
        </View>
      </View>

      {/* Shelf preview — developed rolls stand like spines; the empty slot pulls
          for the next one. */}
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
          {shelf.map((roll) => (
            <View key={roll.id} style={[styles.spine, { backgroundColor: roll.tint }]}>
              <ThemedText selectable={false} style={styles.spineNum}>
                {roll.id}
              </ThemedText>
              <ThemedText selectable={false} style={styles.spineTitle}>
                {roll.title}
              </ThemedText>
            </View>
          ))}
          <View style={[styles.spineEmpty, { borderColor: theme.border }]}>
            <ThemedText type="edge" themeColor="textSecondary">
              빈 롤
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
  captureBlock: { alignItems: 'center', gap: Spacing.three },
  captureLink: { borderRadius: Radius.pill },
  ringOuter: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ringTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 48,
    borderWidth: 4,
  },
  ringCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    boxShadow: '0 0 26px rgba(234,94,56,0.5)',
  },
  captureHint: {},
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
