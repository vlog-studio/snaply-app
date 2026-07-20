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
      contentContainerStyle={[styles.content, { paddingTop: Spacing.seven + topInset }]}
    >
      <FadeInView
        duration={360}
        fromScale={0.6}
        offsetY={0}
        style={[styles.successMark, { backgroundColor: theme.successSoft }]}
      >
        <ThemedText selectable={false} style={[styles.check, { color: theme.success }]}>
          ✓
        </ThemedText>
      </FadeInView>
      <View style={styles.headerCopy}>
        <ThemedText type="title" style={styles.centerText}>
          찰나가 완성됐어요.
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          {getCaptureMoodLabel(mood)} 무드의 {duration}초 클립을 보관함에 추가했어요.
        </ThemedText>
      </View>

      <FadeInView
        delay={100}
        duration={420}
        style={[styles.preview, { backgroundColor: '#C4875B' }]}
      >
        <View style={[styles.previewGlow, { backgroundColor: theme.primary }]} />
        <View style={styles.previewTopRow}>
          <View style={styles.previewBadge}>
            <ThemedText selectable={false} style={styles.previewBadgeText}>
              ✦ AI EDIT
            </ThemedText>
          </View>
          <ThemedText style={styles.previewTime}>{duration}.0s</ThemedText>
        </View>
        <ThemedText selectable={false} style={styles.previewEmoji}>
          ☕
        </ThemedText>
        <View style={styles.previewBottom}>
          <ThemedText type="heading" style={styles.whiteText}>
            카페의 한 장면
          </ThemedText>
          <ThemedText style={styles.mutedWhite}>오늘 오후 · {getCaptureMoodLabel(mood)}</ThemedText>
        </View>
        <View style={styles.playButton}>
          <ThemedText selectable={false} style={styles.playIcon}>
            ▶
          </ThemedText>
        </View>
      </FadeInView>

      <View style={styles.editSummary}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          자동 편집된 요소
        </ThemedText>
        <View style={styles.tagRow}>
          {['✦ 반짝이', '♬ 효과음', '◐ 웜 필터'].map((item) => (
            <View key={item} style={[styles.editTag, { backgroundColor: theme.aiSoft }]}>
              <ThemedText selectable={false} type="smallBold" themeColor="ai">
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <SnaplyButton title="보관함에서 보기" onPress={() => router.replace('/archive')} />
        <SnaplyButton
          title="다른 순간 촬영"
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
  successMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  check: { fontSize: 28, fontWeight: '900' },
  headerCopy: { gap: Spacing.two },
  centerText: { textAlign: 'center' },
  preview: {
    width: '78%',
    maxWidth: 330,
    aspectRatio: 0.76,
    maxHeight: 440,
    alignSelf: 'center',
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    padding: Spacing.four,
    justifyContent: 'space-between',
    overflow: 'hidden',
    boxShadow: '0 22px 52px rgba(18,23,46,0.22)',
  },
  previewGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    top: -90,
    right: -80,
    opacity: 0.5,
  },
  previewTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewBadge: {
    backgroundColor: 'rgba(18,23,46,0.55)',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  previewBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  previewTime: { color: '#FFFFFF', fontSize: 13, fontVariant: ['tabular-nums'] },
  previewEmoji: { fontSize: 84, textAlign: 'center' },
  previewBottom: { gap: Spacing.one },
  whiteText: { color: '#FFFFFF' },
  mutedWhite: { color: 'rgba(255,255,255,0.7)' },
  playButton: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -29 }, { translateY: -29 }],
  },
  playIcon: { color: '#1A1A2E', fontSize: 18 },
  editSummary: { gap: Spacing.three },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  editTag: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actions: { gap: Spacing.three },
});
