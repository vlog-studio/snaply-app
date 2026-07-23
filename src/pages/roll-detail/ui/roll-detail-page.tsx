import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCaptureMoodLabel } from '@/entities/capture-session';
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
              style={[styles.frame, { backgroundColor: theme.film, borderColor: theme.border }]}
            >
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
              style={[styles.frameEmpty, { borderColor: theme.border }]}
            >
              <ThemedText selectable={false} style={[styles.frameGhost, { color: theme.border }]}>
                ?
              </ThemedText>
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
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.six },
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
  frame: {
    width: '30%',
    aspectRatio: 0.72,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: Spacing.two,
    justifyContent: 'space-between',
  },
  frameIndex: {},
  frameMeta: { alignSelf: 'flex-end' },
  frameEmpty: {
    width: '30%',
    aspectRatio: 0.72,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
