import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import {
  getCaptureMoodLabel,
  normalizeCaptureDuration,
  normalizeCaptureMood,
} from '@/entities/capture-session';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { MaxContentWidth, Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CaptureEditingPageProps = {
  durationValue?: string;
  moodValue?: string;
};

export function CaptureEditingPage({ durationValue, moodValue }: CaptureEditingPageProps) {
  const theme = useTheme();
  const mood = normalizeCaptureMood(moodValue);
  const duration = normalizeCaptureDuration(durationValue);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = Math.min(current + 4, 100);
        if (next === 100) clearInterval(timer);
        return next;
      });
    }, 90);

    return () => clearInterval(timer);
  }, []);

  const isComplete = progress === 100;
  const status = progress < 32 ? '장면을 분석하고 있어요' : progress < 70 ? '효과와 리듬을 맞추는 중' : '마지막 디테일을 정리해요';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.media }}
      contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.brandRow}>
        <View style={[styles.aiMark, { backgroundColor: theme.ai }]}>
          <ThemedText selectable={false} style={styles.aiMarkText}>✦</ThemedText>
        </View>
        <ThemedText type="eyebrow" style={styles.violetText}>SNAPLY AI</ThemedText>
      </Animated.View>

      <View style={styles.centerArea}>
        <Animated.View entering={FadeInDown.duration(480)} style={styles.previewStack}>
          <View style={[styles.previewBack, { backgroundColor: '#4D3B65' }]} />
          <View style={[styles.previewMiddle, { backgroundColor: '#824E42' }]} />
          <View style={[styles.previewFront, { backgroundColor: '#C4875B' }]}>
            <ThemedText selectable={false} style={styles.previewEmoji}>☕</ThemedText>
            <View style={styles.sparkOne}><ThemedText selectable={false} style={styles.spark}>✦</ThemedText></View>
            <View style={styles.sparkTwo}><ThemedText selectable={false} style={styles.spark}>✧</ThemedText></View>
          </View>
        </Animated.View>

        <View style={styles.statusCopy}>
          <ThemedText type="title" style={styles.whiteText}>
            {isComplete ? '브이로그 준비 완료!' : '찍은 순간을 다듬는 중'}
          </ThemedText>
          <ThemedText style={styles.mutedWhite}>
            {isComplete ? `${getCaptureMoodLabel(mood)} 무드로 완성했어요.` : status}
          </ThemedText>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressHeader}>
            <ThemedText type="smallBold" style={styles.whiteText}>{duration}초 클립</ThemedText>
            <ThemedText style={[styles.violetText, styles.tabularNumber]}>{progress}%</ThemedText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressValue, { width: `${progress}%`, backgroundColor: theme.ai }]} />
          </View>
        </View>

        {isComplete ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.resultAction}>
            <Link
              href={{ pathname: '/capture/result', params: { mood, duration: String(duration) } }}
              replace
              asChild>
              <SnaplyButton title="완성본 보기" variant="ai" icon="▶" />
            </Link>
          </Animated.View>
        ) : (
          <View style={styles.tipRow}>
            <ThemedText selectable={false} style={styles.tipIcon}>♬</ThemedText>
            <ThemedText type="small" style={styles.mutedWhite}>영상에 어울리는 효과음도 고르고 있어요.</ThemedText>
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
    paddingTop: Spacing.six,
    paddingBottom: Spacing.seven,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  aiMark: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  aiMarkText: { color: '#FFFFFF', fontSize: 18 },
  centerArea: { flex: 1, justifyContent: 'center', gap: Spacing.six },
  previewStack: { height: 300, alignItems: 'center', justifyContent: 'center' },
  previewBack: {
    position: 'absolute',
    width: 190,
    height: 246,
    borderRadius: Radius.xlarge,
    transform: [{ rotate: '-10deg' }, { translateX: -34 }],
    opacity: 0.55,
  },
  previewMiddle: {
    position: 'absolute',
    width: 190,
    height: 246,
    borderRadius: Radius.xlarge,
    transform: [{ rotate: '9deg' }, { translateX: 34 }],
    opacity: 0.72,
  },
  previewFront: {
    width: 194,
    height: 256,
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
  },
  previewEmoji: { fontSize: 72 },
  sparkOne: { position: 'absolute', top: 35, right: 28 },
  sparkTwo: { position: 'absolute', bottom: 38, left: 28 },
  spark: { color: '#FFFFFF', fontSize: 24 },
  statusCopy: { alignItems: 'center', gap: Spacing.two },
  whiteText: { color: '#FFFFFF', textAlign: 'center' },
  mutedWhite: { color: 'rgba(255,255,255,0.62)', textAlign: 'center' },
  violetText: { color: '#B69BFF' },
  progressBlock: { gap: Spacing.two },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: { height: 8, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  progressValue: { height: '100%', borderRadius: Radius.pill },
  tabularNumber: { fontVariant: ['tabular-nums'] },
  tipRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
  tipIcon: { color: '#B69BFF', fontSize: 20 },
  resultAction: { width: '100%' },
});
