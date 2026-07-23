import { CameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  type CaptureDuration,
  type CaptureMood,
  getCaptureMoodLabel,
} from '@/entities/capture-session';
import { useTodayRoll } from '@/entities/roll';
import { SnaplyButton } from '@/shared/ui/snaply-button';
import { Radius, Spacing, useReducedMotion, useTheme } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { VideoPreview } from '@/shared/ui/video-preview';

import { useCaptureRecorder } from '../model/use-capture-recorder';
import { CollectFlight } from './collect-flight';
import { HoldRing } from './hold-ring';
import { RecordingLibrary } from './recording-library';

// How long the "담김" confirmation badge lingers after a collect.
const COLLECTED_BADGE_MS = 1100;

// The 담기 ring sits just outside the 88px shutter (5px stroke + breathing gap).
const HOLD_RING_SIZE = 108;

// Inline viewfinder options. Accents track the darkroom mood palette shared with
// the mood copy in entities/capture-session.
const MOOD_CHIPS: { accent: string; emoji: string; id: CaptureMood }[] = [
  { id: 'hip', emoji: '🔥', accent: '#EA5E38' }, // ember
  { id: 'lovely', emoji: '💕', accent: '#D98AA0' }, // warm rose
  { id: 'energy', emoji: '⚡', accent: '#82D6CE' }, // lumen
];

const DURATION_OPTIONS: readonly CaptureDuration[] = [3, 5];

export function CaptureRecordPage() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {
    mood,
    duration,
    selectMood,
    selectDuration,
    lastCollected,
    stage,
    remaining,
    isBusy,
    showCamera,
    isRecordingSupported,
    soundEnabled,
    toggleSound,
    facing,
    toggleFacing,
    isCameraReady,
    cameraRef,
    handleCameraReady,
    handleMountError,
    selectedRecording,
    errorMessage,
    beginHold,
    endHold,
    closePage,
    retake,
    dismissErrors,
    recordings,
    isLibraryLoading,
    libraryError,
    deletingId,
    isLibraryVisible,
    openLibrary,
    closeLibrary,
    selectRecording,
    deleteRecording,
    isCameraGranted,
    isPermissionReady,
    canAskAgain,
    permissionMessage,
    requestPermissions,
    openAppSettings,
  } = useCaptureRecorder();

  // In-camera collect feedback: the just-captured clip flies up into the roll
  // counter; when it lands, the count bumps and the counter pops. Collecting
  // stays on the viewfinder instead of bouncing Home.
  const reducedMotion = useReducedMotion();
  const todayRoll = useTodayRoll();
  const collectedCount = todayRoll?.clipRefs.length ?? 0;
  const collectedCountRef = useRef(collectedCount);

  useEffect(() => {
    collectedCountRef.current = collectedCount;
  }, [collectedCount]);

  // The pill count trails the store until the flying clip arrives, so the number
  // bumps as the clip lands rather than the instant it is persisted.
  const [displayedCount, setDisplayedCount] = useState(collectedCount);
  const [flight, setFlight] = useState<{ key: number; uri: string }>();
  const [showCollectedBadge, setShowCollectedBadge] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const processedNonce = useRef(0);
  const badgeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const counterPulse = useSharedValue(0);

  const flashCollectedBadge = () => {
    setShowCollectedBadge(true);
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    badgeTimer.current = setTimeout(() => setShowCollectedBadge(false), COLLECTED_BADGE_MS);
  };

  // The clip reached the counter: reveal the new count and pop the pill.
  const handleFlightArrive = () => {
    setFlight(undefined);
    setDisplayedCount(collectedCountRef.current);
    setPulseKey((key) => key + 1);
    flashCollectedBadge();
  };

  // Each collect starts a flight; reduced motion lands it immediately.
  useEffect(() => {
    const nonce = lastCollected?.nonce ?? 0;
    if (nonce === 0 || nonce === processedNonce.current) return;
    processedNonce.current = nonce;
    if (reducedMotion) {
      setDisplayedCount(collectedCountRef.current);
      flashCollectedBadge();
      return;
    }
    setFlight({ key: nonce, uri: lastCollected?.uri ?? '' });
  }, [lastCollected, reducedMotion]);

  // Pop the counter on landing (kept in an effect so the shared-value write is
  // outside any memoized callback).
  useEffect(() => {
    if (pulseKey === 0) return;
    counterPulse.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 440, easing: Easing.out(Easing.cubic) }),
    );
  }, [pulseKey, counterPulse]);

  useEffect(
    () => () => {
      if (badgeTimer.current) clearTimeout(badgeTimer.current);
    },
    [],
  );

  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + counterPulse.value * 0.16 }],
  }));

  if (!isCameraGranted && stage !== 'review') {
    return (
      <View
        style={[
          styles.permissionScreen,
          { backgroundColor: theme.media, paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Pressable
          accessibilityLabel="촬영 닫기"
          onPress={closePage}
          style={[styles.permissionClose, { top: insets.top + Spacing.three }]}
        >
          <ThemedText selectable={false} style={styles.utilityIcon}>
            ×
          </ThemedText>
        </Pressable>
        <View style={styles.permissionContent}>
          <View style={[styles.permissionIcon, { borderColor: theme.primary }]}>
            <ThemedText
              selectable={false}
              style={[styles.permissionIconText, { color: theme.primary }]}
            >
              ●
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.whiteText}>
            카메라를 사용할 수 없어요
          </ThemedText>
          <ThemedText style={styles.permissionDescription}>{permissionMessage}</ThemedText>
          {isPermissionReady ? (
            <SnaplyButton
              title={canAskAgain ? '카메라·마이크 권한 허용' : '설정에서 권한 열기'}
              onPress={canAskAgain ? requestPermissions : openAppSettings}
              style={styles.permissionAction}
            />
          ) : null}
          <SnaplyButton
            title={`담은 컷 보기 (${recordings.length})`}
            variant="secondary"
            onPress={openLibrary}
            style={styles.permissionAction}
          />
          {libraryError ? (
            <ThemedText type="small" style={styles.permissionError}>
              {libraryError}
            </ThemedText>
          ) : null}
        </View>
        <RecordingLibrary
          deletingId={deletingId}
          isLoading={isLibraryLoading}
          onClose={closeLibrary}
          onDelete={deleteRecording}
          onSelect={selectRecording}
          recordings={recordings}
          visible={isLibraryVisible}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.media }]}>
      <View style={[styles.cameraSurface, { paddingTop: insets.top + Spacing.three }]}>
        {showCamera ? (
          <CameraView
            facing={facing}
            mirror={facing === 'front'}
            mode="video"
            mute={!soundEnabled}
            onCameraReady={handleCameraReady}
            onMountError={({ message }) => handleMountError(message || '')}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            videoQuality="720p"
          />
        ) : null}
        {stage === 'review' && selectedRecording && !isLibraryVisible ? (
          <VideoPreview
            key={selectedRecording.id}
            muted={!soundEnabled}
            uri={selectedRecording.uri}
          />
        ) : null}

        <View style={styles.cameraShade} pointerEvents="none" />

        {flight ? (
          <CollectFlight key={flight.key} uri={flight.uri} onArrive={handleFlightArrive} />
        ) : null}

        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="촬영 닫기"
            onPress={closePage}
            style={styles.utilityButton}
          >
            <ThemedText selectable={false} style={styles.utilityIcon}>
              ×
            </ThemedText>
          </Pressable>
          <Animated.View style={[styles.modePill, counterStyle]}>
            <ThemedText selectable={false} type="edge" style={styles.whiteText}>
              오늘의 롤{displayedCount > 0 ? ` · ${displayedCount}컷` : ''}
            </ThemedText>
          </Animated.View>
          <Pressable
            accessibilityLabel={soundEnabled ? '녹음 소리 끄기' : '녹음 소리 켜기'}
            accessibilityState={{ disabled: isBusy }}
            disabled={isBusy}
            onPress={toggleSound}
            style={[styles.utilityButton, isBusy && styles.disabledControl]}
          >
            <ThemedText selectable={false} style={styles.soundIcon}>
              {soundEnabled ? '♪' : '∅'}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.focusArea} pointerEvents="box-none">
          {stage === 'idle' && !showCollectedBadge ? (
            <View style={styles.focusFrame} pointerEvents="none">
              <ThemedText selectable={false} type="edge" style={styles.frameMeta}>
                꾹 눌러 담기
              </ThemedText>
            </View>
          ) : null}
          {stage === 'idle' && showCollectedBadge ? (
            <View style={[styles.completedBadge, { backgroundColor: 'rgba(14,11,8,0.82)' }]}>
              <ThemedText selectable={false} type="edge" style={{ color: theme.lumen }}>
                담김 · 오늘의 롤 {displayedCount}컷
              </ThemedText>
            </View>
          ) : null}
          {stage === 'recording' ? (
            <View style={styles.recordingStatus}>
              <View style={[styles.recordingDot, { backgroundColor: theme.primary }]} />
              <ThemedText type="edge" style={styles.whiteText}>
                REC
              </ThemedText>
              <ThemedText type="edge" style={[styles.whiteText, styles.tabularNumber]}>
                {remaining > 0 ? `${remaining}s` : '마무리 중…'}
              </ThemedText>
            </View>
          ) : null}
          {stage === 'saving' ? (
            <View style={[styles.completedBadge, { backgroundColor: 'rgba(14,11,8,0.82)' }]}>
              <ThemedText selectable={false} type="edge" style={{ color: theme.amber }}>
                컷을 담는 중…
              </ThemedText>
            </View>
          ) : null}
          {stage === 'review' ? (
            <View style={[styles.completedBadge, { backgroundColor: 'rgba(14,11,8,0.82)' }]}>
              <ThemedText selectable={false} type="edge" style={{ color: theme.lumen }}>
                담김 · 미현상
              </ThemedText>
            </View>
          ) : null}
          {errorMessage ? (
            <Pressable
              accessibilityRole="button"
              onPress={dismissErrors}
              style={styles.errorBanner}
            >
              <ThemedText type="smallBold" style={styles.whiteText}>
                {errorMessage}
              </ThemedText>
              <ThemedText selectable={false} type="small" style={styles.errorDismiss}>
                닫기
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + Spacing.five }]}>
          {stage === 'idle' && isRecordingSupported ? (
            <View style={styles.optionsBar}>
              <View style={styles.moodChips}>
                {MOOD_CHIPS.map((chip) => {
                  const isSelected = mood === chip.id;
                  return (
                    <Pressable
                      key={chip.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={getCaptureMoodLabel(chip.id)}
                      onPress={() => selectMood(chip.id)}
                      style={[
                        styles.moodChip,
                        isSelected && {
                          borderColor: chip.accent,
                          backgroundColor: `${chip.accent}26`,
                        },
                      ]}
                    >
                      <ThemedText selectable={false} style={styles.moodChipEmoji}>
                        {chip.emoji}
                      </ThemedText>
                      <ThemedText
                        selectable={false}
                        type="smallBold"
                        style={isSelected ? styles.whiteText : styles.mutedWhite}
                      >
                        {getCaptureMoodLabel(chip.id)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.durationToggle}>
                {DURATION_OPTIONS.map((seconds) => {
                  const isSelected = duration === seconds;
                  return (
                    <Pressable
                      key={seconds}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={`${seconds}초`}
                      onPress={() => selectDuration(seconds)}
                      style={[styles.durationSeg, isSelected && styles.durationSegActive]}
                    >
                      <ThemedText
                        selectable={false}
                        type="smallBold"
                        style={isSelected ? { color: theme.media } : styles.mutedWhite}
                      >
                        {seconds}초
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
          {stage === 'review' ? (
            <View style={styles.reviewActions}>
              <SnaplyButton title="다시 담기" style={styles.reviewButton} onPress={retake} />
            </View>
          ) : (
            <View style={styles.captureControls}>
              <Pressable
                accessibilityLabel={`저장 영상 ${recordings.length}개 보기`}
                accessibilityRole="button"
                disabled={isBusy}
                onPress={openLibrary}
                style={[styles.sideControl, isBusy && styles.disabledControl]}
              >
                <ThemedText selectable={false} style={styles.sideControlIcon}>
                  ▣
                </ThemedText>
                <ThemedText selectable={false} type="small" style={styles.mutedWhite}>
                  보관함 {recordings.length}
                </ThemedText>
              </Pressable>
              <View style={styles.shutterArea}>
                <HoldRing
                  active={stage === 'recording'}
                  durationMs={duration * 1000}
                  size={HOLD_RING_SIZE}
                />
                <Pressable
                  accessibilityHint="누르는 동안 담기고, 손을 떼면 끝나요"
                  accessibilityLabel="꾹 눌러 담기"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: stage === 'saving' || !isCameraReady || !isRecordingSupported,
                  }}
                  disabled={stage === 'saving' || !isCameraReady || !isRecordingSupported}
                  onPressIn={beginHold}
                  onPressOut={endHold}
                  style={[
                    styles.shutterOuter,
                    stage === 'recording' && styles.shutterRecording,
                    (!isCameraReady || !isRecordingSupported) && styles.disabledControl,
                  ]}
                >
                  <View
                    style={[
                      styles.shutterInner,
                      { backgroundColor: theme.primary },
                      stage === 'recording' && styles.shutterInnerRecording,
                    ]}
                  />
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel="카메라 전환"
                accessibilityRole="button"
                disabled={isBusy}
                onPress={toggleFacing}
                style={[styles.sideControl, isBusy && styles.disabledControl]}
              >
                <ThemedText selectable={false} style={styles.sideControlIcon}>
                  ↻
                </ThemedText>
                <ThemedText selectable={false} type="small" style={styles.mutedWhite}>
                  전환
                </ThemedText>
              </Pressable>
            </View>
          )}
          <ThemedText type="small" style={styles.helperText}>
            {!isRecordingSupported
              ? '순간 담기는 iOS 또는 Android 기기에서 사용할 수 있어요'
              : stage === 'recording'
                ? '손을 떼면 바로 담기가 끝나요'
                : stage === 'saving'
                  ? '앱을 닫지 말고 잠시 기다려 주세요'
                  : stage === 'review'
                    ? '보관함에서 이전 컷도 다시 고를 수 있어요'
                    : collectedCount > 0
                      ? '이어서 담거나, ✕를 눌러 오늘의 롤을 확인해요'
                      : `가운데 버튼을 꾹 누르는 동안 담겨요 · 최대 ${duration}초`}
          </ThemedText>
          {stage === 'review' ? (
            <Pressable accessibilityRole="button" onPress={openLibrary} style={styles.libraryLink}>
              <ThemedText selectable={false} type="smallBold" style={styles.whiteText}>
                담은 컷 {recordings.length}개 관리
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <RecordingLibrary
        deletingId={deletingId}
        isLoading={isLibraryLoading}
        onClose={closeLibrary}
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.four,
  },
  frameMeta: { color: 'rgba(255,255,255,0.66)' },
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
  optionsBar: { alignItems: 'center', gap: Spacing.three },
  moodChips: { flexDirection: 'row', gap: Spacing.two },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  moodChipEmoji: { fontSize: 16 },
  durationToggle: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  durationSeg: {
    minWidth: 56,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  durationSegActive: { backgroundColor: '#FFFFFF' },
  captureControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  shutterArea: {
    width: HOLD_RING_SIZE,
    height: HOLD_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    boxShadow: '0 0 22px rgba(234,94,56,0.5)',
  },
  shutterRecording: { transform: [{ scale: 0.92 }] },
  shutterInnerRecording: { width: 32, height: 32, borderRadius: Radius.small },
  sideControl: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  sideControlIcon: { color: '#FFFFFF', fontSize: 26, lineHeight: 28 },
  disabledControl: { opacity: 0.42 },
  reviewActions: { flexDirection: 'row', gap: Spacing.three },
  reviewButton: { flex: 1 },
  helperText: { color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  libraryLink: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
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
