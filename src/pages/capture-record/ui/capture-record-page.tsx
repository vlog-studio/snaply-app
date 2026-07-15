import * as Haptics from 'expo-haptics';
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getCaptureMoodLabel,
  normalizeCaptureDuration,
  normalizeCaptureMood,
} from '@/entities/capture-session';
import { RecordingPreview, useLocalRecordings } from '@/features/manage-recordings';
import type { LocalRecording } from '@/shared/lib/recording-files';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

import { RecordingLibrary } from './recording-library';

type CaptureStage = 'idle' | 'recording' | 'saving' | 'review';

type CaptureRecordPageProps = {
  durationValue?: string;
  moodValue?: string;
};

const isNativeRecordingSupported =
  process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android';

export function CaptureRecordPage({ durationValue, moodValue }: CaptureRecordPageProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const isRecording = useRef(false);
  const hasRequestedRecordingPermissions = useRef(false);
  const mood = normalizeCaptureMood(moodValue);
  const duration = normalizeCaptureDuration(durationValue);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [stage, setStage] = useState<CaptureStage>('idle');
  const [remaining, setRemaining] = useState<number>(duration);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<LocalRecording>();
  const [captureError, setCaptureError] = useState<string>();
  const {
    recordings,
    isLoading,
    deletingId,
    errorMessage: libraryError,
    clearError: clearLibraryError,
    saveRecording,
    removeRecording,
  } = useLocalRecordings();

  const requestMissingRecordingPermissions = useCallback(async () => {
    if (!cameraPermission?.granted && cameraPermission?.canAskAgain) {
      await requestCameraPermission();
    }
    if (!microphonePermission?.granted && microphonePermission?.canAskAgain) {
      await requestMicrophonePermission();
    }
  }, [
    cameraPermission,
    microphonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  useEffect(() => {
    if (
      !cameraPermission ||
      !microphonePermission ||
      hasRequestedRecordingPermissions.current
    ) {
      return;
    }

    const needsCameraPermission = !cameraPermission.granted && cameraPermission.canAskAgain;
    const needsMicrophonePermission =
      !microphonePermission.granted && microphonePermission.canAskAgain;
    if (!needsCameraPermission && !needsMicrophonePermission) return;

    hasRequestedRecordingPermissions.current = true;
    void requestMissingRecordingPermissions().catch(() => {
      setCaptureError('카메라와 마이크 권한을 요청하지 못했어요. 설정에서 권한을 확인해 주세요.');
    });
  }, [cameraPermission, microphonePermission, requestMissingRecordingPermissions]);

  useEffect(() => {
    if (stage !== 'recording') return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setRemaining(Math.max(duration - elapsedSeconds, 0));
    }, 250);

    return () => clearInterval(timer);
  }, [duration, stage]);

  const dismissErrors = () => {
    setCaptureError(undefined);
    clearLibraryError();
  };

  const startRecording = async () => {
    if (
      !isNativeRecordingSupported ||
      !cameraRef.current ||
      !isCameraReady ||
      stage !== 'idle' ||
      isRecording.current
    ) {
      return;
    }

    isRecording.current = true;
    dismissErrors();

    try {
      if (soundEnabled && !microphonePermission?.granted) {
        const nextPermission = await requestMicrophonePermission();
        if (!nextPermission.granted) {
          setCaptureError('소리와 함께 촬영하려면 마이크 권한이 필요해요. 소리를 끄면 무음으로 촬영할 수 있어요.');
          return;
        }
      }

      if (!cameraRef.current) return;

      setRemaining(duration);
      setStage('recording');
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await cameraRef.current.recordAsync({ maxDuration: duration });
      if (!result?.uri) {
        setCaptureError('촬영 결과를 가져오지 못했어요. 다시 시도해 주세요.');
        setStage('idle');
        return;
      }

      setStage('saving');
      const savedRecording = await saveRecording(result.uri);
      if (!savedRecording) {
        setStage('idle');
        return;
      }

      setSelectedRecording(savedRecording);
      setStage('review');
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setCaptureError('촬영을 완료하지 못했어요. 카메라 상태를 확인하고 다시 시도해 주세요.');
      setStage('idle');
    } finally {
      isRecording.current = false;
    }
  };

  const stopRecording = () => {
    if (!isRecording.current) return;
    cameraRef.current?.stopRecording();
  };

  const closePage = () => {
    if (isRecording.current) cameraRef.current?.stopRecording();
    router.back();
  };

  const retake = () => {
    setSelectedRecording(undefined);
    setIsCameraReady(false);
    setRemaining(duration);
    setStage('idle');
    dismissErrors();
  };

  const selectRecording = (recording: LocalRecording) => {
    setSelectedRecording(recording);
    setStage('review');
    setIsLibraryVisible(false);
    dismissErrors();
  };

  const openLibrary = () => {
    if (stage === 'idle') setIsCameraReady(false);
    setIsLibraryVisible(true);
  };

  const deleteRecording = async (recording: LocalRecording) => {
    const wasDeleted = await removeRecording(recording);
    if (wasDeleted && selectedRecording?.id === recording.id) retake();
  };

  const continueToEditing = () => {
    if (!selectedRecording) return;

    router.replace({
      pathname: '/capture/editing',
      params: { duration: String(duration), mood },
    });
  };

  const permissionMessage = cameraPermission
    ? '영상을 촬영하려면 카메라 접근 권한이 필요해요.'
    : '카메라 권한을 확인하고 있어요.';

  if (!cameraPermission?.granted && stage !== 'review') {
    return (
      <View style={[styles.permissionScreen, { backgroundColor: theme.media, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable accessibilityLabel="촬영 닫기" onPress={closePage} style={[styles.permissionClose, { top: insets.top + Spacing.three }]}>
          <ThemedText selectable={false} style={styles.utilityIcon}>×</ThemedText>
        </Pressable>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}>
            <ThemedText selectable={false} style={styles.permissionIconText}>●</ThemedText>
          </View>
          <ThemedText type="title" style={styles.whiteText}>카메라를 사용할 수 없어요</ThemedText>
          <ThemedText style={styles.permissionDescription}>{permissionMessage}</ThemedText>
          {cameraPermission ? (
            <SnaplyButton
              title={cameraPermission.canAskAgain ? '카메라·마이크 권한 허용' : '설정에서 권한 열기'}
              onPress={
                cameraPermission.canAskAgain
                  ? () => {
                      void requestMissingRecordingPermissions().catch(() => {
                        setCaptureError('카메라와 마이크 권한을 요청하지 못했어요. 설정에서 권한을 확인해 주세요.');
                      });
                    }
                  : () => void Linking.openSettings()
              }
              style={styles.permissionAction}
            />
          ) : null}
          <SnaplyButton
            title={`저장 영상 보기 (${recordings.length})`}
            variant="secondary"
            onPress={openLibrary}
            style={styles.permissionAction}
          />
          {libraryError ? (
            <ThemedText type="small" style={styles.permissionError}>{libraryError}</ThemedText>
          ) : null}
        </View>
        <RecordingLibrary
          deletingId={deletingId}
          isLoading={isLoading}
          onClose={() => setIsLibraryVisible(false)}
          onDelete={deleteRecording}
          onSelect={selectRecording}
          recordings={recordings}
          visible={isLibraryVisible}
        />
      </View>
    );
  }

  const errorMessage = captureError ?? libraryError;
  const isBusy = stage === 'recording' || stage === 'saving';
  const showCamera = stage !== 'review' && !isLibraryVisible;

  return (
    <View style={[styles.screen, { backgroundColor: theme.media }]}>
      <View style={[styles.cameraSurface, { paddingTop: insets.top + Spacing.three }]}>
        {showCamera ? (
          <CameraView
            facing={facing}
            mirror={facing === 'front'}
            mode="video"
            mute={!soundEnabled}
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={({ message }) => setCaptureError(message || '카메라를 시작하지 못했어요.')}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            videoQuality="720p"
          />
        ) : null}
        {stage === 'review' && selectedRecording && !isLibraryVisible ? (
          <RecordingPreview
            key={`${selectedRecording.id}-${soundEnabled ? 'sound' : 'muted'}`}
            muted={!soundEnabled}
            uri={selectedRecording.uri}
          />
        ) : null}

        <View style={styles.cameraShade} pointerEvents="none" />

        <View style={styles.topBar}>
          <Pressable accessibilityLabel="촬영 닫기" onPress={closePage} style={styles.utilityButton}>
            <ThemedText selectable={false} style={styles.utilityIcon}>×</ThemedText>
          </Pressable>
          <View style={styles.modePill}>
            <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>
              {getCaptureMoodLabel(mood)} · {duration}초
            </ThemedText>
          </View>
          <Pressable
            accessibilityLabel={soundEnabled ? '녹음 소리 끄기' : '녹음 소리 켜기'}
            accessibilityState={{ disabled: isBusy }}
            disabled={isBusy}
            onPress={() => setSoundEnabled((current) => !current)}
            style={[styles.utilityButton, isBusy && styles.disabledControl]}>
            <ThemedText selectable={false} style={styles.soundIcon}>{soundEnabled ? '♪' : '∅'}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.focusArea} pointerEvents="box-none">
          {stage === 'idle' ? <View style={styles.focusFrame} pointerEvents="none" /> : null}
          {stage === 'recording' ? (
            <View style={styles.recordingStatus}>
              <View style={[styles.recordingDot, { backgroundColor: theme.primary }]} />
              <ThemedText type="smallBold" style={styles.whiteText}>REC</ThemedText>
              <ThemedText style={[styles.whiteText, styles.tabularNumber]}>{remaining}s</ThemedText>
            </View>
          ) : null}
          {stage === 'saving' ? (
            <View style={styles.completedBadge}>
              <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>영상을 저장하는 중…</ThemedText>
            </View>
          ) : null}
          {stage === 'review' ? (
            <View style={styles.completedBadge}>
              <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>✓ 앱에 저장됨</ThemedText>
            </View>
          ) : null}
          {errorMessage ? (
            <Pressable accessibilityRole="button" onPress={dismissErrors} style={styles.errorBanner}>
              <ThemedText type="smallBold" style={styles.whiteText}>{errorMessage}</ThemedText>
              <ThemedText selectable={false} type="small" style={styles.errorDismiss}>닫기</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.five }]}>
          {stage === 'review' ? (
            <View style={styles.reviewActions}>
              <SnaplyButton title="다시 찍기" variant="secondary" style={styles.reviewButton} onPress={retake} />
              <SnaplyButton title="이 영상 사용" style={styles.reviewButton} onPress={continueToEditing} />
            </View>
          ) : (
            <View style={styles.captureControls}>
              <Pressable
                accessibilityLabel={`저장 영상 ${recordings.length}개 보기`}
                accessibilityRole="button"
                disabled={isBusy}
                onPress={openLibrary}
                style={[styles.sideControl, isBusy && styles.disabledControl]}>
                <ThemedText selectable={false} style={styles.sideControlIcon}>▣</ThemedText>
                <ThemedText selectable={false} type="small" style={styles.mutedWhite}>보관함 {recordings.length}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityLabel={stage === 'recording' ? '촬영 끝내기' : '촬영 시작'}
                accessibilityRole="button"
                accessibilityState={{ disabled: stage === 'saving' || !isCameraReady || !isNativeRecordingSupported }}
                disabled={stage === 'saving' || !isCameraReady || !isNativeRecordingSupported}
                onPress={stage === 'recording' ? stopRecording : () => void startRecording()}
                style={[
                  styles.shutterOuter,
                  stage === 'recording' && styles.shutterRecording,
                  (!isCameraReady || !isNativeRecordingSupported) && styles.disabledControl,
                ]}>
                <View
                  style={[
                    styles.shutterInner,
                    { backgroundColor: theme.primary },
                    stage === 'recording' && styles.shutterInnerRecording,
                  ]}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="카메라 전환"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => {
                  setIsCameraReady(false);
                  setFacing((current) => (current === 'back' ? 'front' : 'back'));
                }}
                style={[styles.sideControl, isBusy && styles.disabledControl]}>
                <ThemedText selectable={false} style={styles.sideControlIcon}>↻</ThemedText>
                <ThemedText selectable={false} type="small" style={styles.mutedWhite}>전환</ThemedText>
              </Pressable>
            </View>
          )}
          <ThemedText type="small" style={styles.helperText}>
            {!isNativeRecordingSupported
              ? '영상 녹화는 iOS 또는 Android 기기에서 사용할 수 있어요'
              : stage === 'recording'
                ? '가운데 버튼을 누르면 바로 촬영을 끝낼 수 있어요'
                : stage === 'saving'
                  ? '앱을 닫지 말고 잠시 기다려 주세요'
                  : stage === 'review'
                    ? '보관함에서 이전 영상도 다시 선택할 수 있어요'
                    : '가운데 버튼을 누르면 자동으로 촬영이 끝나요'}
          </ThemedText>
          {stage === 'review' ? (
            <Pressable
              accessibilityRole="button"
              onPress={openLibrary}
              style={styles.libraryLink}>
              <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>
                저장 영상 {recordings.length}개 관리
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <RecordingLibrary
        deletingId={deletingId}
        isLoading={isLoading}
        onClose={() => setIsLibraryVisible(false)}
        onDelete={deleteRecording}
        onSelect={selectRecording}
        recordings={recordings}
        visible={isLibraryVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  cameraSurface: { flex: 1, overflow: 'hidden' },
  cameraShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
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
    backgroundColor: 'rgba(0,0,0,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityIcon: { color: '#FFFFFF', fontSize: 30, lineHeight: 32 },
  soundIcon: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  modePill: {
    backgroundColor: 'rgba(0,0,0,0.36)',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  focusArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingHorizontal: Spacing.five,
  },
  focusFrame: {
    width: '72%',
    maxWidth: 340,
    aspectRatio: 0.8,
    borderRadius: Radius.xlarge,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.38)',
    backgroundColor: 'transparent',
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.48)',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4 },
  completedBadge: {
    backgroundColor: 'rgba(46,173,113,0.9)',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  errorBanner: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(120,20,20,0.92)',
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  errorDismiss: { color: 'rgba(255,255,255,0.72)' },
  bottomControls: { paddingHorizontal: Spacing.five, gap: Spacing.three },
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
  shutterRecording: { transform: [{ scale: 0.92 }] },
  shutterInnerRecording: { width: 32, height: 32, borderRadius: Radius.small },
  sideControl: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  sideControlIcon: { color: '#FFFFFF', fontSize: 26, lineHeight: 28 },
  disabledControl: { opacity: 0.42 },
  reviewActions: { flexDirection: 'row', gap: Spacing.three },
  reviewButton: { flex: 1 },
  helperText: { color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  libraryLink: { alignSelf: 'center', paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  whiteText: { color: '#FFFFFF' },
  mutedWhite: { color: 'rgba(255,255,255,0.72)', textAlign: 'center', lineHeight: 18 },
  tabularNumber: { fontVariant: ['tabular-nums'] },
  permissionScreen: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.five },
  permissionClose: {
    position: 'absolute',
    left: Spacing.four,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: { alignItems: 'center', gap: Spacing.four },
  permissionIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIconText: { color: '#FF6B35', fontSize: 44, lineHeight: 48 },
  permissionDescription: { color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  permissionError: { color: '#FFB4AB', textAlign: 'center' },
  permissionAction: { width: '100%', maxWidth: 360 },
});
