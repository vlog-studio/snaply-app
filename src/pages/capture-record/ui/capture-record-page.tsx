import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getCaptureMoodLabel,
  normalizeCaptureDuration,
  normalizeCaptureMood,
} from '@/entities/capture-session';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

type CaptureStage = 'idle' | 'recording' | 'review';

type CaptureRecordPageProps = {
  durationValue?: string;
  moodValue?: string;
};

export function CaptureRecordPage({ durationValue, moodValue }: CaptureRecordPageProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const mood = normalizeCaptureMood(moodValue);
  const duration = normalizeCaptureDuration(durationValue);
  const [stage, setStage] = useState<CaptureStage>('idle');
  const [remaining, setRemaining] = useState<number>(duration);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (stage !== 'recording') return;

    const timer = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setStage('review');
          if (Platform.OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, stage]);

  const startRecording = () => {
    setRemaining(duration);
    setStage('recording');
    if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const continueToEditing = () => {
    router.replace({
      pathname: '/capture/editing',
      params: { duration: String(duration), mood },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.media }]}>
      <View style={[styles.cameraSurface, { paddingTop: insets.top + Spacing.three }]}>
        <View style={[styles.ambient, styles.ambientOne, { backgroundColor: theme.primary }]} />
        <View style={[styles.ambient, styles.ambientTwo, { backgroundColor: theme.ai }]} />

        <View style={styles.topBar}>
          <Pressable accessibilityLabel="촬영 닫기" onPress={() => router.back()} style={styles.utilityButton}>
            <ThemedText selectable={false} style={styles.utilityIcon}>×</ThemedText>
          </Pressable>
          <View style={styles.modePill}>
            <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>
              {getCaptureMoodLabel(mood)} · {duration}초
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel={soundEnabled ? '소리 끄기' : '소리 켜기'}
            onPress={() => setSoundEnabled((current) => !current)}
            style={styles.utilityButton}>
            <ThemedText selectable={false} style={styles.soundIcon}>{soundEnabled ? '♪' : '∅'}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.focusArea}>
          <View style={styles.focusFrame}>
            <ThemedText selectable={false} style={styles.sceneEmoji}>☕</ThemedText>
          </View>
          {stage === 'recording' ? (
            <View style={styles.recordingStatus}>
              <View style={[styles.recordingDot, { backgroundColor: theme.primary }]} />
              <ThemedText type="smallBold" style={styles.whiteText}>REC</ThemedText>
              <ThemedText style={[styles.whiteText, styles.tabularNumber]}>{remaining}s</ThemedText>
            </View>
          ) : null}
          {stage === 'review' ? (
            <View style={styles.completedBadge}>
              <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>✓ 촬영 완료</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.five }]}>
          {stage === 'review' ? (
            <View style={styles.reviewActions}>
              <SnaplyButton
                title="다시 찍기"
                variant="secondary"
                style={styles.reviewButton}
                onPress={() => setStage('idle')}
              />
              <SnaplyButton
                title="이 영상 사용"
                style={styles.reviewButton}
                onPress={continueToEditing}
              />
            </View>
          ) : (
            <View style={styles.captureControls}>
              <View style={styles.controlSpacer} />
              <Pressable
                accessibilityLabel={stage === 'recording' ? '촬영 중' : '촬영 시작'}
                disabled={stage === 'recording'}
                onPress={startRecording}
                style={[styles.shutterOuter, stage === 'recording' && styles.shutterRecording]}>
                <View style={[styles.shutterInner, { backgroundColor: theme.primary }]} />
              </Pressable>
              <View style={styles.controlSpacer}>
                <ThemedText selectable={false} type="small" style={styles.mutedWhite}>AI{`\n`}AUTO</ThemedText>
              </View>
            </View>
          )}
          <ThemedText type="small" style={styles.helperText}>
            {stage === 'recording' ? '그대로 잠깐만 유지해 주세요' : stage === 'review' ? '마음에 들면 바로 AI 편집으로 넘겨요' : '버튼을 누르면 자동으로 촬영이 끝나요'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  cameraSurface: { flex: 1, overflow: 'hidden' },
  ambient: { position: 'absolute', borderRadius: 999, opacity: 0.2 },
  ambientOne: { width: 420, height: 420, right: -180, top: 80 },
  ambientTwo: { width: 300, height: 300, left: -120, bottom: 120 },
  topBar: {
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  utilityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityIcon: { color: '#FFFFFF', fontSize: 30, lineHeight: 32 },
  soundIcon: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  modePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  focusArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.five },
  focusFrame: {
    width: '72%',
    maxWidth: 340,
    aspectRatio: 0.8,
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sceneEmoji: { fontSize: 84 },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.36)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  completedBadge: {
    backgroundColor: 'rgba(46,173,113,0.88)',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  bottomControls: { paddingHorizontal: Spacing.five, gap: Spacing.four },
  captureControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  shutterOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 68, height: 68, borderRadius: 34 },
  shutterRecording: { opacity: 0.48, transform: [{ scale: 0.9 }] },
  controlSpacer: { flex: 1, alignItems: 'center' },
  reviewActions: { flexDirection: 'row', gap: Spacing.three },
  reviewButton: { flex: 1 },
  helperText: { color: 'rgba(255,255,255,0.64)', textAlign: 'center' },
  whiteText: { color: '#FFFFFF' },
  mutedWhite: { color: 'rgba(255,255,255,0.56)', textAlign: 'center', lineHeight: 18 },
  tabularNumber: { fontVariant: ['tabular-nums'] },
});
