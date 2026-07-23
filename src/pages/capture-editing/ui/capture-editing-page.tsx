import { ScrollView, StyleSheet, View } from 'react-native';

import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { useDevelopCeremony } from '../model/use-develop-ceremony';

type CaptureEditingPageProps = {
  rollId?: string;
};

// The develop ceremony — the emotional payoff of the delayed-develop hook. A
// cold lightbox scan line sweeps the film while color blooms out of the dark.
// The progress timer drives both the scan position and the bloom; on completion
// the reel is composed and persisted (see use-develop-ceremony).
const developFrames = [
  { key: 'a', color: '#C98A44', rotate: '-9deg', translateX: -40, z: 1 },
  { key: 'b', color: '#82D6CE', rotate: '0deg', translateX: 0, z: 3 },
  { key: 'c', color: '#D98AA0', rotate: '9deg', translateX: 40, z: 2 },
];

export function CaptureEditingPage({ rollId }: CaptureEditingPageProps) {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const { roll, clipCount, progress, isComplete, revealReel } = useDevelopCeremony(rollId);

  const bloom = progress / 100;
  const status =
    progress < 32
      ? '컷을 어둠에서 꺼내는 중'
      : progress < 70
        ? '음악 · 전환 · 속도 맞추는 중'
        : '릴로 엮는 중';

  if (!roll) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.content, styles.centered, { paddingTop: Spacing.six + topInset }]}
      >
        <ThemedText type="heading">현상할 롤을 찾을 수 없어요</ThemedText>
        <ThemedText themeColor="textSecondary">이미 사라졌거나 잘못된 주소예요.</ThemedText>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: Spacing.six + topInset }]}
    >
      <FadeInView duration={400} offsetY={0} style={styles.brandRow}>
        <View style={[styles.mark, { backgroundColor: theme.lumen }]}>
          <ThemedText selectable={false} style={styles.markText}>
            ◐
          </ThemedText>
        </View>
        <ThemedText type="edge" themeColor="lumen">
          DARKROOM · 현상 중
        </ThemedText>
      </FadeInView>

      <View style={styles.centerArea}>
        {/* Amber safelight glow deepens as the reel comes together. */}
        <View
          style={[styles.glow, { backgroundColor: theme.primary, opacity: 0.18 + bloom * 0.3 }]}
        />

        <FadeInView duration={480} style={styles.previewStack}>
          {developFrames.map((frame) => (
            <View
              key={frame.key}
              style={[
                styles.developFrame,
                {
                  backgroundColor: theme.film,
                  transform: [{ rotate: frame.rotate }, { translateX: frame.translateX }],
                  zIndex: frame.z,
                },
              ]}
            >
              {/* The negative's color blooms out of the film black. */}
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: frame.color, opacity: bloom }]}
              />
            </View>
          ))}
          {/* Cold lightbox scan line sweeping top→bottom, tied to progress. */}
          {!isComplete ? (
            <View
              style={[styles.scanLine, { top: `${progress}%`, backgroundColor: theme.lumen }]}
            />
          ) : null}
        </FadeInView>

        <View style={styles.statusCopy}>
          <ThemedText type="title" style={styles.centerText}>
            {isComplete ? '릴이 준비됐어요' : '현상하는 중'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            {isComplete ? `${clipCount}컷을 하나의 릴로 엮었어요.` : status}
          </ThemedText>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <ThemedText type="edge" themeColor="amber">
              {clipCount}컷 릴
            </ThemedText>
            <ThemedText type="edge" themeColor="lumen" style={styles.tabularNumber}>
              {progress}%
            </ThemedText>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressValue,
                { width: `${progress}%`, backgroundColor: theme.lumen },
              ]}
            />
          </View>
        </View>

        {isComplete ? (
          <FadeInView duration={300} style={styles.resultAction}>
            <SnaplyButton title="릴 공개" icon="▶" onPress={revealReel} />
          </FadeInView>
        ) : (
          <View style={styles.tipRow}>
            <ThemedText selectable={false} style={[styles.tipIcon, { color: theme.lumen }]}>
              ♬
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              현상소에서 컷을 순서·음악·전환으로 엮고 있어요.
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.seven,
  },
  centered: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mark: {
    width: 34,
    height: 34,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: '#0E0B08', fontSize: 18, fontWeight: '800' },
  centerArea: { flex: 1, justifyContent: 'center', gap: Spacing.six },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: '10%',
  },
  previewStack: { height: 300, alignItems: 'center', justifyContent: 'center' },
  developFrame: {
    position: 'absolute',
    width: 168,
    height: 224,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: '0 20px 45px rgba(0,0,0,0.4)',
  },
  scanLine: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 3,
    borderRadius: 2,
    zIndex: 10,
    boxShadow: '0 0 16px rgba(130,214,206,0.85)',
  },
  statusCopy: { alignItems: 'center', gap: Spacing.two },
  centerText: { textAlign: 'center' },
  progressBlock: { gap: Spacing.two },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressValue: { height: '100%', borderRadius: Radius.pill },
  tabularNumber: { fontVariant: ['tabular-nums'] },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tipIcon: { fontSize: 20 },
  resultAction: { width: '100%' },
});
