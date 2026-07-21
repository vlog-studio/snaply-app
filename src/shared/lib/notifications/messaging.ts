import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

// Thin wrappers over @react-native-firebase/messaging (modular API). Transport/
// native concerns only — permission prompts, token retrieval, listeners. Product
// flow and user-facing copy live in the owning feature. A `.web.ts` sibling
// provides inert stubs so web consumers stay platform-agnostic.

/**
 * Request notification permission. Required on iOS before any FCM delivery; on
 * Android 13+ it maps to the POST_NOTIFICATIONS runtime prompt (a no-op that
 * resolves authorized on older Android). Returns true when authorized.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const status = await requestPermission(getMessaging());
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}

/** iOS: register with APNs before requesting a token. No-op on Android. */
export async function registerForRemoteMessages(): Promise<void> {
  if (Platform.OS === 'ios') {
    await registerDeviceForRemoteMessages(getMessaging());
  }
}

/** Get the current FCM registration token. */
export function getFcmToken(): Promise<string> {
  return getToken(getMessaging());
}

/** Subscribe to token rotation. Returns an unsubscribe function. */
export function onFcmTokenRefresh(listener: (token: string) => void): () => void {
  return onTokenRefresh(getMessaging(), listener);
}

/** Subscribe to messages received while the app is foregrounded. */
export function onForegroundMessage(listener: (message: RemoteMessage) => void): () => void {
  return onMessage(getMessaging(), listener);
}
