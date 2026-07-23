import { type CameraType, type CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { normalizeCaptureDuration, normalizeCaptureMood } from '@/entities/capture-session';
import { useCaptureMoment } from '@/features/capture-moment';
import { useLocalRecordings } from '@/features/manage-recordings';
import type { LocalRecording } from '@/shared/lib/recording-files';

import { useRecordingPermissions } from './use-recording-permissions';

export type CaptureStage = 'idle' | 'recording' | 'saving' | 'review';

type UseCaptureRecorderParams = {
  durationValue?: string;
  moodValue?: string;
};

const isRecordingSupported = process.env.EXPO_OS === 'ios' || process.env.EXPO_OS === 'android';

const PERMISSION_REQUEST_FAILED =
  '카메라와 마이크 권한을 요청하지 못했어요. 설정에서 권한을 확인해 주세요.';

/**
 * Owns the capture-record screen's stateful interaction: the recording state
 * machine, the countdown timer, permission-request orchestration, saving the
 * result through the recordings feature, the review/library flow, and screen
 * navigation. The page component consumes this and only renders.
 */
export function useCaptureRecorder({ durationValue, moodValue }: UseCaptureRecorderParams) {
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

  const mood = normalizeCaptureMood(moodValue);
  const duration = normalizeCaptureDuration(durationValue);

  const [stage, setStage] = useState<CaptureStage>('idle');
  const [remaining, setRemaining] = useState<number>(duration);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLibraryVisible, setIsLibraryVisible] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<LocalRecording>();
  const [captureError, setCaptureError] = useState<string>();

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

      if (!cameraRef.current) return;

      setRemaining(duration);
      setStage('recording');
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const result = await cameraRef.current.recordAsync({ maxDuration: duration });
      if (isClosing.current) return;
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
      if (process.env.EXPO_OS === 'ios') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.dismissAll();
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
    isClosing.current = true;
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

  const closeLibrary = () => setIsLibraryVisible(false);

  const deleteRecording = async (recording: LocalRecording) => {
    const wasDeleted = await removeRecording(recording);
    if (wasDeleted && selectedRecording?.id === recording.id) retake();
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
    startRecording,
    stopRecording,
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
