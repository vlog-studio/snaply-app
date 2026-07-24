import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useRolls, useTodayRoll } from '@/entities/roll';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
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
import { formatReelLength } from '@/widgets/developed-rolls-shelf';

// A daily roll shows its captures against a soft target of empty frames so the
// gaps invite more collecting (concept §4, "빈칸을 보여준다"). This is a display
// target, not a hard capacity — the "all-day" rule keeps accepting clips.
const ROLL_SIZE = 12;

// Contact-sheet preview holds up to this many frames on Home; the full grid
// lives on the roll-detail screen.
const PREVIEW_SLOTS = 6;

export function HomePage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const [developInfoOpen, setDevelopInfoOpen] = useState(false);
  const todayRoll = useTodayRoll();
  const rolls = useRolls();
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

  return (
    <>
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
        {/* 오늘의 롤 — the day's undeveloped negatives, bounded as its own section
          so the film-black strip reads as film against a lighter darkroom
          surface instead of dissolving into the near-black page. The section
          header (edge print, title, counter) lives inside the panel so the
          whole roll reads as one integrated unit. The strip holds one negative
          frame per real clip (up to a 6-frame preview) then dashed empty slots
          that invite more captures, and opens the full roll. Capture itself is
          the center safelight button in the tab bar (concept §6), so Home holds
          no capture ring. */}
        <FadeInView
          duration={420}
          style={[
            styles.rollPanel,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        >
          <View style={styles.rollHeader}>
            <ThemedText type="edge" themeColor="amber">
              {rollNumber ? `ROLL ${String(rollNumber).padStart(3, '0')} · ` : ''}
              {rollDate}
            </ThemedText>
            <View style={styles.titleRow}>
              <ThemedText type="heading">오늘의 롤</ThemedText>
              <ThemedText type="edge" themeColor="primary">
                {String(captured).padStart(2, '0')}/{ROLL_SIZE} · 미현상
              </ThemedText>
            </View>
          </View>

          <Link
            accessibilityLabel="오늘의 롤 열기"
            href={{ pathname: '/roll/[id]', params: { id: todayRoll?.id ?? '' } }}
            asChild
            disabled={!todayRoll}
          >
            <Pressable accessibilityRole="button">
              <View style={[styles.filmStrip, { backgroundColor: theme.film }]}>
                <View style={styles.perf}>
                  {Array.from({ length: 9 }).map((_, index) => (
                    <View
                      key={index}
                      style={[styles.perfHole, { backgroundColor: theme.backgroundSelected }]}
                    />
                  ))}
                </View>
                <View style={styles.frameRow}>
                  {Array.from({ length: filledPreview }).map((_, index) => (
                    <View
                      key={`clip-${index}`}
                      style={[
                        styles.frameWindow,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          borderWidth: 1,
                        },
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
                      <ThemedText
                        selectable={false}
                        style={[styles.frameGhost, { color: theme.textSecondary }]}
                      >
                        ?
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <View style={styles.perf}>
                  {Array.from({ length: 9 }).map((_, index) => (
                    <View
                      key={index}
                      style={[styles.perfHole, { backgroundColor: theme.backgroundSelected }]}
                    />
                  ))}
                </View>
              </View>
            </Pressable>
          </Link>

          {/* Delayed develop no longer occupies a full Home card — a compact hint
            row inside the section opens the darkroom explanation in a bottom
            sheet, keeping the anticipation without crowding Home. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="현상 안내 보기"
            onPress={() => setDevelopInfoOpen(true)}
            style={[styles.developHint, { borderTopColor: theme.border }]}
          >
            <View style={styles.developHintText}>
              <ThemedText type="edge" themeColor="lumen">
                DARKROOM
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                하루가 끝나면 현상돼요
              </ThemedText>
            </View>
            <ThemedText type="edge" themeColor="lumen">
              자세히 ›
            </ThemedText>
          </Pressable>
        </FadeInView>
      </ScrollView>

      {/* Darkroom develop notice — moved off Home into a bottom sheet so the
          poetic explanation guides on demand instead of taking a permanent
          card. Its live clip count and estimated reel length come from today's
          real roll. */}
      <BottomSheet
        accessibilityLabel="현상 안내"
        visible={developInfoOpen}
        onClose={() => setDevelopInfoOpen(false)}
      >
        <ThemedText type="edge" themeColor="lumen">
          DARKROOM · 대기 중
        </ThemedText>
        <ThemedText type="heading">하루가 끝나면 현상해요</ThemedText>
        <ThemedText themeColor="textSecondary">
          담은 순간은 어둠 속에 모입니다. 아직은 완성본을 보여주지 않아요 — 하루가 끝나면 필름을
          현상하듯 하나의 릴로 엮어 처음으로 공개됩니다.
        </ThemedText>
        <View style={[styles.sheetMeta, { borderTopColor: theme.border }]}>
          <ThemedText type="edge" themeColor="amber">
            {captured}컷 · 예상 릴 {formatReelLength(captured * 5)}
          </ThemedText>
        </View>
      </BottomSheet>
    </>
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
  rollHeader: { gap: Spacing.one, paddingHorizontal: Spacing.one },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rollPanel: {
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
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
  frameGhost: { fontSize: 18, fontWeight: '700', opacity: 0.5 },
  developHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.one,
  },
  developHintText: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sheetMeta: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
    flexDirection: 'row',
  },
});
