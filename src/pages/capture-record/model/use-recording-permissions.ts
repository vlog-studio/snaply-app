import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useCallback } from 'react';
import { Linking } from 'react-native';

/**
 * Camera + microphone permission acquisition for video recording.
 * Owns permission state and the "which permissions are still missing" logic;
 * the recorder decides how to surface request failures to the user.
 */
export function useRecordingPermissions() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const requestMissingPermissions = useCallback(async () => {
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

  const openAppSettings = useCallback(() => void Linking.openSettings(), []);

  const message = cameraPermission
    ? '영상을 촬영하려면 카메라 접근 권한이 필요해요.'
    : '카메라 권한을 확인하고 있어요.';

  return {
    cameraPermission,
    microphonePermission,
    requestMicrophonePermission,
    requestMissingPermissions,
    openAppSettings,
    message,
  };
}
