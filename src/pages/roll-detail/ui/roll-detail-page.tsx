import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCaptureMoodLabel } from '@/entities/capture-session';
import { NegativeFrame } from '@/shared/ui/negative-frame';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useRollDetail } from '../model/use-roll-detail';

type RollDetailPageProps = {
  rollId?: string;
};

// The daily roll's nominal capacity — the "총" in the counter and the number of
// empty slots that invite more captures (concept §4 "빈칸을 보여준다").
const ROLL_SIZE = 12;

export function RollDetailPage({ rollId }: RollDetailPageProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = useTopContentInset();
  const { roll, clips, canDevelop } = useRollDetail(rollId);

  if (!roll) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ThemedText type="heading">롤을 찾을 수 없어요</ThemedText>
        <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
      </View>
    );
  }

  const emptySlots = Math.max(ROLL_SIZE - clips.length, 0);
  const isDeveloped = roll.status === 'developed' && roll.reel !== undefined;

  const develop = () => {
    // Enter the develop ceremony; it composes and persists the reel on
    // completion (see pages/capture-editing) and reveals the reel player.
    router.push({ pathname: '/capture/editing', params: { rollId: roll.id } });
  };

  const openReel = () => {
    router.push({ pathname: '/capture/result', params: { rollId: roll.id } });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.five + topInset, paddingBottom: Spacing.seven },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="edge" themeColor="amber">
            ROLL · {roll.dayKey ?? '—'} · {roll.status === 'developed' ? '현상됨' : '미현상'}
          </ThemedText>
          <View style={styles.titleRow}>
            <ThemedText type="title">{roll.title}</ThemedText>
            <ThemedText type="edge" themeColor="primary">
              {String(clips.length).padStart(2, '0')}/{ROLL_SIZE}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary">
            담은 순간은 어둠 속에 모여 있어요. 현상하기 전까지는 완성본을 보여주지 않아요.
          </ThemedText>
        </View>

        {/* Grid contact sheet — undeveloped negatives (content stays hidden until
            develop) plus the empty slots that invite more captures. */}
        <View style={styles.grid}>
          {clips.map((clip, index) => (
            <View
              key={clip.id}
              accessibilityLabel={`${index + 1}번째 컷 · ${clip.durationSec}초${
                clip.mood ? ` · ${getCaptureMoodLabel(clip.mood)}` : ''
              } · 미현상`}
              style={[styles.frameCell, { backgroundColor: theme.film, borderColor: theme.border }]}
            >
              {/* In-flow sizing anchor — see the `frameFill` style note. Without a
                flex child a percentage-width + aspectRatio cell doesn't take its
                aspectRatio height in the wrapping grid, so it collapses. Every
                other child here (the negative, the two edge labels) is absolutely
                positioned and can't serve as that anchor. */}
              <View style={styles.frameFill} />
              <NegativeFrame uri={clip.uri} />
              <ThemedText type="edge" themeColor="amber" style={styles.frameIndex}>
                {String(index + 1).padStart(2, '0')}
              </ThemedText>
              <ThemedText type="edge" themeColor="textSecondary" style={styles.frameMeta}>
                {clip.durationSec}s
              </ThemedText>
            </View>
          ))}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <View
              key={`empty-${index}`}
              style={[styles.frameCell, styles.frameEmpty, { borderColor: theme.border }]}
            >
              {/* Same in-flow anchor as a filled cell so the empty slot keeps its
                aspectRatio height even in an all-empty row (with no filled sibling
                to stretch it); it also centers the ghost glyph. */}
              <View style={styles.frameFill}>
                <ThemedText selectable={false} style={[styles.frameGhost, { color: theme.border }]}>
                  ?
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}
      >
        {isDeveloped ? (
          <SnaplyButton title="릴 보기" icon="▶" onPress={openReel} />
        ) : (
          <SnaplyButton title="현상하기" icon="✦" disabled={!canDevelop} onPress={develop} />
        )}
        <ThemedText type="small" themeColor="textSecondary" style={styles.footerHint}>
          {isDeveloped
            ? '현상된 릴을 다시 볼 수 있어요.'
            : canDevelop
              ? '모아둔 컷을 하나의 릴로 엮어요.'
              : '아직 담은 컷이 없어요. 순간을 먼저 담아보세요.'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.six,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.six,
  },
  header: { gap: Spacing.two },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  // In-flow anchor shared by both cell kinds: a `flex: 1` child is what makes the
  // percentage-width + aspectRatio cell actually take its aspectRatio height in
  // the wrapping grid. Filled cells stack the negative + edge labels on top as
  // absolute fills; empty cells put their ghost glyph inside it (hence centered).
  frameFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // One standardized contact-sheet cell drives both filled and empty frames, so
  // the grid reads as regular equal negatives; only the fill (a thumbnail vs the
  // dashed ghost) differs, never the geometry. The thumbnail fills exactly this
  // cell (NegativeFrame is an absolute fill, clipped by `overflow: 'hidden'`).
  frameCell: {
    width: '30%',
    aspectRatio: 0.72,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Edge index and duration float in opposite corners so neither displaces the
  // negative fill.
  frameIndex: { position: 'absolute', top: Spacing.two, left: Spacing.two },
  frameMeta: { position: 'absolute', bottom: Spacing.two, right: Spacing.two },
  // Centering lives on the inner `frameFill`; the empty cell only adds the dash.
  frameEmpty: {
    borderStyle: 'dashed',
  },
  frameGhost: { fontSize: 18, fontWeight: '700' },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    gap: Spacing.two,
  },
  footerHint: { textAlign: 'center' },
});
