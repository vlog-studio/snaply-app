import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  getCaptureMoodLabel,
  normalizeCaptureDuration,
  normalizeCaptureMood,
} from '@/entities/capture-session';
import { FadeInView } from '@/shared/ui/fade-in-view';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CaptureResultPageProps = {
  durationValue?: string;
  moodValue?: string;
};

export function CaptureResultPage({ durationValue, moodValue }: CaptureResultPageProps) {
  const router = useRouter();
  const theme = useTheme();
  const topInset = useTopContentInset();
  const mood = normalizeCaptureMood(moodValue);
  const duration = normalizeCaptureDuration(durationValue);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: Spacing.six + topInset }]}
    >
      <View style={styles.headerCopy}>
        <ThemedText type="edge" themeColor="lumen">
          ROLL 019 · 현상 완료
        </ThemedText>
        <ThemedText type="title">릴이 공개됐어요</ThemedText>
        <ThemedText themeColor="textSecondary">
          {getCaptureMoodLabel(mood)} 무드의 {duration}초 릴을 오늘의 롤에서 처음으로 재생해요.
        </ThemedText>
      </View>

      {/* Reel player — the developed short-form, framed like a viewfinder. */}
      <FadeInView delay={100} duration={420} fromScale={0.92} style={styles.reel}>
        <View style={[styles.reelWash, { backgroundColor: '#D98AA0' }]} />
        <View style={styles.reelShade} pointerEvents="none" />
        <View style={styles.reelTop}>
          <ThemedText selectable={false} style={styles.reelEdge}>
            ROLL 019 · {duration}.0s
          </ThemedText>
          <View style={styles.developedBadge}>
            <ThemedText selectable={false} style={[styles.developedText, { color: theme.lumen }]}>
              현상 완료
            </ThemedText>
          </View>
        </View>

        <View style={styles.playButton}>
          <ThemedText selectable={false} style={styles.playIcon}>
            ▶
          </ThemedText>
        </View>

        <View style={styles.reelBottom}>
          <View style={styles.moodPill}>
            <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>
              무드: {getCaptureMoodLabel(mood)}
            </ThemedText>
            <ThemedText selectable={false} style={styles.moodCaret}>
              ▾
            </ThemedText>
          </View>
          <View style={[styles.reelProgress, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <View style={[styles.reelProgressValue, { backgroundColor: theme.lumen }]} />
          </View>
        </View>
      </FadeInView>

      <View style={styles.editSummary}>
        <ThemedText type="edge" themeColor="textSecondary">
          이 릴에 들어간 것
        </ThemedText>
        <View style={styles.tagRow}>
          {['♬ BGM', '⇄ 전환', '◑ 톤 보정'].map((item) => (
            <View
              key={item}
              style={[styles.editTag, { backgroundColor: theme.aiSoft, borderColor: theme.border }]}
            >
              <ThemedText selectable={false} type="smallBold" themeColor="lumen">
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <SnaplyButton title="보관함에서 보기" onPress={() => router.replace('/archive')} />
        <SnaplyButton
          title="다른 순간 담기"
          variant="secondary"
          onPress={() => router.replace('/capture')}
        />
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
    paddingBottom: Spacing.eight,
    gap: Spacing.five,
  },
  headerCopy: { gap: Spacing.two },
  reel: {
    width: '82%',
    maxWidth: 340,
    aspectRatio: 0.62,
    maxHeight: 460,
    alignSelf: 'center',
    borderRadius: Radius.large,
    borderCurve: 'continuous',
    padding: Spacing.four,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#0E0B08',
    boxShadow: '0 24px 52px rgba(0,0,0,0.5)',
  },
  reelWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.85,
  },
  reelShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    boxShadow:
      'inset 0 -90px 90px -20px rgba(10,7,5,0.92), inset 0 70px 60px -30px rgba(10,7,5,0.7)',
  },
  reelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reelEdge: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#FFFFFF',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  developedBadge: {
    backgroundColor: 'rgba(14,11,8,0.6)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  developedText: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  playButton: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(20,15,11,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    top: '46%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
  },
  playIcon: { color: '#F1E6DA', fontSize: 20, marginLeft: 3 },
  reelBottom: { gap: Spacing.three },
  moodPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(20,15,11,0.6)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  moodCaret: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  whiteText: { color: '#FFFFFF' },
  reelProgress: { height: 3, borderRadius: 2, overflow: 'hidden' },
  reelProgressValue: { width: '38%', height: '100%', borderRadius: 2 },
  editSummary: { gap: Spacing.three },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  editTag: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: { gap: Spacing.three },
});
