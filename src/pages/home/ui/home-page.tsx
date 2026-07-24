import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useClips, type Clip } from '@/entities/clip';
import { useRolls, useTodayRoll } from '@/entities/roll';
import { BottomSheet } from '@/shared/ui/bottom-sheet';
import { FadeInView } from '@/shared/ui/fade-in-view';
import { NegativeFrame } from '@/shared/ui/negative-frame';
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

export function HomePage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();
  const [developInfoOpen, setDevelopInfoOpen] = useState(false);
  const todayRoll = useTodayRoll();
  const rolls = useRolls();
  const clips = useClips();
  const captured = todayRoll?.clipRefs.length ?? 0;

  // Every real clip of today's roll, ordered, so each frame can sample its own
  // negative. The strip scrolls horizontally, so it holds the whole roll rather
  // than a capped preview — no clip past the sixth goes unseen. Cross-entity join
  // (roll refs + clip archive) belongs at the page layer — neither entity imports
  // the other (mirrors useRollDetail).
  const rollClips = useMemo<Clip[]>(() => {
    if (!todayRoll) return [];
    const byId = new Map(clips.map((clip) => [clip.id, clip]));
    return [...todayRoll.clipRefs]
      .sort((left, right) => left.order - right.order)
      .map((ref) => byId.get(ref.clipId))
      .filter((clip): clip is Clip => clip !== undefined);
  }, [todayRoll, clips]);
  const emptySlots = Math.max(ROLL_SIZE - rollClips.length, 0);
  // Perforations tile across the whole film so they travel with the frames as it
  // scrolls; roughly two holes per frame keeps the sprocket cadence steady no
  // matter how long the strip grows.
  const perfHoleCount = (rollClips.length + emptySlots) * 2;
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
          frame per real clip — scrolling horizontally so the whole roll is
          reachable, not just the first few — then dashed empty slots that invite
          more captures, and opens the full roll. Capture itself is the center
          safelight button in the tab bar (concept §6), so Home holds no capture
          ring. */}
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

          {/* The whole strip opens the roll on tap, but it also scrolls
            horizontally through every frame. The ScrollView must be the parent
            and the tap target its child — a ScrollView nested inside a Pressable
            loses its pan to the Pressable (the strip won't scroll, and releasing
            after a drag fires the tap). With the Pressable inside instead, the
            ScrollView owns the pan and cancels the child press on scroll, so a
            drag scrolls and only a clean tap opens the roll. */}
          <View style={[styles.filmStrip, { backgroundColor: theme.film }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Link
                accessibilityLabel="오늘의 롤 열기"
                href={{ pathname: '/roll/[id]', params: { id: todayRoll?.id ?? '' } }}
                asChild
                disabled={!todayRoll}
              >
                {/* Perforations live inside the scrollable film so the whole
                  strip — sprocket holes and all — travels as one piece rather
                  than the frames sliding under a fixed border. */}
                <Pressable accessibilityRole="button" style={styles.filmContent}>
                  <View style={styles.perf}>
                    {Array.from({ length: perfHoleCount }).map((_, index) => (
                      <View
                        key={index}
                        style={[styles.perfHole, { backgroundColor: theme.backgroundSelected }]}
                      />
                    ))}
                  </View>
                  <View style={styles.frameRow}>
                    {rollClips.map((clip, index) => (
                      <View
                        key={clip.id}
                        style={[
                          styles.frameCell,
                          { backgroundColor: theme.film, borderColor: theme.border },
                        ]}
                      >
                        <NegativeFrame uri={clip.uri} />
                        <ThemedText
                          selectable={false}
                          type="edge"
                          themeColor="amber"
                          style={styles.frameIndex}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </ThemedText>
                      </View>
                    ))}
                    {Array.from({ length: emptySlots }).map((_, index) => (
                      <View
                        key={`empty-${index}`}
                        style={[styles.frameCell, styles.frameEmpty, { borderColor: theme.border }]}
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
                    {Array.from({ length: perfHoleCount }).map((_, index) => (
                      <View
                        key={index}
                        style={[styles.perfHole, { backgroundColor: theme.backgroundSelected }]}
                      />
                    ))}
                  </View>
                </Pressable>
              </Link>
            </ScrollView>
          </View>

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
    // Clip the scrolling film to the rounded window so frames and perforations
    // disappear cleanly at the panel's edges instead of poking past the corners.
    overflow: 'hidden',
  },
  // The scrolling film body — perforation row, frames, perforation row stacked as
  // one piece so they travel together. Each row stretches to the frame row's
  // width (the widest child), so the perforations span the whole strip.
  filmContent: { gap: Spacing.two },
  perf: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.two,
  },
  perfHole: { width: 14, height: 8, borderRadius: 2 },
  frameRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  // One standardized film cell drives both filled and empty frames, so the strip
  // reads as a regular row of equal negatives; only the fill (a thumbnail vs the
  // dashed ghost) differs, never the geometry. The thumbnail fills exactly this
  // cell (NegativeFrame is an absolute fill, clipped by `overflow: 'hidden'`).
  frameCell: {
    width: 54,
    aspectRatio: 0.72,
    borderRadius: 4,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  // The edge index floats in the corner so it never displaces the negative fill.
  frameIndex: { position: 'absolute', top: Spacing.one, right: Spacing.one },
  frameEmpty: {
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
