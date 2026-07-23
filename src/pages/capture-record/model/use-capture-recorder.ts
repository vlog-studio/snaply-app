import { type CameraType, type CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import {
  type CaptureDuration,
  type CaptureMood,
  normalizeCaptureDuration,
  normalizeCaptureMood,
} from '@/entities/capture-session';
import { useCaptureMoment } from '@/features/capture-moment';
import { useLocalRecordings } from '@/features/manage-recordings';
import type { LocalRecording } from '@/shared/lib/recording-files';

import { shouldCollectHold } from './hold-gesture';
import { useRecordingPermissions } from './use-recording-permissions';

export type CaptureStage = 'idle' | 'recording' | 'saving' | 'review';

const isRecordingSupported = process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android';

const PERMISSION_REQUEST_FAILED =
  '카메라와 마이크 권한을 요청하지 못했어요. 설정에서 권한을 확인해 주세요.';

/**
 * Owns the capture-record screen's stateful interaction: the recording state
 * machine, the countdown timer, permission-request orchestration, saving the
 * result through the recordings feature, the review/library flow, and screen
 * navigation. The page component consumes this and only renders.
 *
 * The capture options (mood, duration) are owned here as local state and tuned
 * inline in the viewfinder while idle, rather than in a separate setup screen.
 */
export function useCaptureRecorder() {
  const router = useRouter();
  const {
    cameraPermission,
    microphonePermission,
    requestMicrophonePermission,
    requestMissingPermissions,
    openAppSettings,
    message: permissionMessage,
  } = useRecordingPermissions();
  const {
    recordings,
    isLoading: isLibraryLoading,
    deletingId,
    errorMessage: libraryError,
    clearError: clearLibraryError,
    removeRecording,
  } = useLocalRecordings();
  const { captureMoment, error: momentError, clearError: clearMomentError } = useCaptureMoment();

  const cameraRef = useRef<CameraView>(null);
  const isRecording = useRef(false);
  const isClosing = useRef(false);
  const hasRequestedRecordingPermissions = useRef(false);
  const isHolding = useRef(false);
  const holdStartedAt = useRef<number | undefined>(undefined);
  const heldMs = useRef<number | undefined>(undefined);
  const collectNonce = useRef(0);

  const [mood, setMood] = useState<CaptureMood>(() => normalizeCaptureMood(undefined));
  const [duration, setDuration] = useState<CaptureDuration>(() =>
    normalizeCaptureDuration(undefined),
  );

  const [stage, setStage] = useState<CaptureStage>('idle');
  const [remaining, setRemaining] = useState<number>(duration);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<LocalRecording>();
  const [captureError, setCaptureError] = useState<string>();
  // The most recently collected clip, handed to the page so it can fly the clip
  // into the roll counter. `nonce` makes each collect a distinct event even when
  // the same file id recurs.
  const [lastCollected, setLastCollected] = useState<{ nonce: number; uri: string }>();

  useEffect(() => {
    if (!cameraPermission || !microphonePermission || hasRequestedRecordingPermissions.current) {
      return;
    }

    const needsCameraPermission = !cameraPermission.granted && cameraPermission.canAskAgain;
    const needsMicrophonePermission =
      !microphonePermission.granted && microphonePermission.canAskAgain;
    if (!needsCameraPermission && !needsMicrophonePermission) return;

    hasRequestedRecordingPermissions.current = true;
    void requestMissingPermissions().catch(() => {
      setCaptureError(PERMISSION_REQUEST_FAILED);
    });
  }, [cameraPermission, microphonePermission, requestMissingPermissions]);

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
    clearMomentError();
  };

  const requestPermissions = () => {
    void requestMissingPermissions().catch(() => {
      setCaptureError(PERMISSION_REQUEST_FAILED);
    });
  };

  const startRecording = async () => {
    if (
      !isRecordingSupported ||
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
          setCaptureError(
            '소리와 함께 촬영하려면 마이크 권한이 필요해요. 소리를 끄면 무음으로 촬영할 수 있어요.',
          );
          return;
        }
      }

      // The mic permission prompt can outlast the press; a released finger
      // means the user no longer intends to collect.
      if (!cameraRef.current || !isHolding.current) return;

      setRemaining(duration);
      setStage('recording');
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await cameraRef.current.recordAsync({ maxDuration: duration });
      if (isClosing.current) return;

      // Auto-stop at maxDuration resolves with the finger still down; measure
      // the hold at resolution time in that case.
      const finalHeldMs =
        heldMs.current ??
        (holdStartedAt.current !== undefined ? Date.now() - holdStartedAt.current : 0);
      if (!shouldCollectHold(finalHeldMs)) {
        // Accidental tap: leave the temp recording in the cache (the OS
        // reclaims it) and return to idle without collecting or erroring.
        setStage('idle');
        return;
      }

      if (!result?.uri) {
        setCaptureError('촬영 결과를 가져오지 못했어요. 다시 시도해 주세요.');
        setStage('idle');
        return;
      }

      setStage('saving');
      // 담기: persist the clip and add it to today's roll. In the MVP loop there
      // is no review/editing — the moment stays undeveloped and we return Home,
      // where the roll counter reflects the new clip.
      const clip = await captureMoment(result.uri, { durationSec: duration, mood });
      if (!clip) {
        setStage('idle');
        return;
      }

      if (isClosing.current) return;
      // Continuous capture: stay in the viewfinder, ready for the next hold, so
      // the user is never yanked Home mid-session. Hand the page the clip so it
      // can fly it into the roll counter as in-camera feedback.
      collectNonce.current += 1;
      setLastCollected({ nonce: collectNonce.current, uri: clip.uri });
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setStage('idle');
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

  // Press-and-hold collect gesture (concept §7): recording runs only while the
  // shutter is held. Release stops it early; the native maxDuration still ends
  // it automatically when the ring completes.
  const beginHold = () => {
    if (stage !== 'idle' || isRecording.current) return;
    isHolding.current = true;
    holdStartedAt.current = Date.now();
    heldMs.current = undefined;
    void startRecording();
  };

  const endHold = () => {
    if (!isHolding.current) return;
    isHolding.current = false;
    if (holdStartedAt.current !== undefined) {
      heldMs.current = Date.now() - holdStartedAt.current;
    }
    stopRecording();
  };

  const closePage = () => {
    // Explicit leave: always go Home (not the tab that opened capture) so the
    // user lands on the roll they just built, and its landing beat plays.
    isClosing.current = true;
    if (isRecording.current) cameraRef.current?.stopRecording();
    router.dismissAll();
    router.navigate('/');
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

  const closeLibrary = () => setIsLibraryVisible(false);

  const deleteRecording = async (recording: LocalRecording) => {
    const wasDeleted = await removeRecording(recording);
    if (wasDeleted && selectedRecording?.id === recording.id) retake();
  };

  // Options are tuned only while idle; once a hold starts the run is committed.
  const selectMood = (nextMood: CaptureMood) => {
    if (stage !== 'idle') return;
    setMood(nextMood);
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
  };

  const selectDuration = (nextDuration: CaptureDuration) => {
    if (stage !== 'idle') return;
    setDuration(nextDuration);
    setRemaining(nextDuration);
    if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
  };

  const toggleSound = () => setSoundEnabled((current) => !current);

  const toggleFacing = () => {
    // iOS keeps the capture session alive across facing changes and never
    // re-emits onCameraReady; only Android recreates the camera and re-fires it.
    if (process.env.EXPO_OS === 'android') setIsCameraReady(false);
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleCameraReady = () => setIsCameraReady(true);

  const handleMountError = (mountMessage: string) =>
    setCaptureError(mountMessage || '카메라를 시작하지 못했어요.');

  return {
    // capture options
    mood,
    duration,
    selectMood,
    selectDuration,
    // collect feedback
    lastCollected,
    // recording state
    stage,
    remaining,
    isBusy: stage === 'recording' || stage === 'saving',
    showCamera: stage !== 'review' && !isLibraryVisible,
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
    errorMessage: captureError ?? momentError ?? libraryError,
    // recording actions
    beginHold,
    endHold,
    closePage,
    retake,
    dismissErrors,
    // library
    recordings,
    isLibraryLoading,
    libraryError,
    deletingId,
    isLibraryVisible,
    openLibrary,
    closeLibrary,
    selectRecording,
    deleteRecording,
    // permission gate
    isCameraGranted: Boolean(cameraPermission?.granted),
    isPermissionReady: Boolean(cameraPermission),
    canAskAgain: Boolean(cameraPermission?.canAskAgain),
    permissionMessage,
    requestPermissions,
    openAppSettings,
  };
}
