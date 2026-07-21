import type { RemoteMessage } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

// Thin wrappers over @react-native-firebase/messaging (modular API). Transport/
// native concerns only — permission prompts, token retrieval, listeners. Product
// flow and user-facing copy live in the owning feature. A `.web.ts` sibling
// provides inert stubs so web consumers stay platform-agnostic.

// The Firebase package throws at module evaluation when its native module is
// absent (Expo Go, or a dev client built before Firebase was added), so it must
// be loaded lazily. When unavailable, these wrappers degrade to the same inert
// behavior as the web stubs: permission resolves false, which stops any
// downstream token work.
type FirebaseMessaging = typeof import('@react-native-firebase/messaging');

const messaging: FirebaseMessaging | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import evaluates (and throws) before this guard can run
    return require('@react-native-firebase/messaging') as FirebaseMessaging;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[push] @react-native-firebase/messaging native module unavailable ' +
          '(Expo Go or stale dev build) — push notifications disabled:',
        String(error),
      );
    }
    return null;
  }
})();

/**
 * Request notification permission. Required on iOS before any FCM delivery; on
 * Android 13+ it maps to the POST_NOTIFICATIONS runtime prompt (a no-op that
 * resolves authorized on older Android). Returns true when authorized.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!messaging) return false;
  const status = await messaging.requestPermission(messaging.getMessaging());
  return (
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/** iOS: register with APNs before requesting a token. No-op on Android. */
export async function registerForRemoteMessages(): Promise<void> {
  if (!messaging) return;
  if (Platform.OS === 'ios') {
    await messaging.registerDeviceForRemoteMessages(messaging.getMessaging());
  }
}

/** Get the current FCM registration token. */
export function getFcmToken(): Promise<string> {
  if (!messaging) return Promise.reject(new Error('FCM native module is not available'));
  return messaging.getToken(messaging.getMessaging());
}

/** Subscribe to token rotation. Returns an unsubscribe function. */
export function onFcmTokenRefresh(listener: (token: string) => void): () => void {
  if (!messaging) return () => {};
  return messaging.onTokenRefresh(messaging.getMessaging(), listener);
}

/** Subscribe to messages received while the app is foregrounded. */
export function onForegroundMessage(listener: (message: RemoteMessage) => void): () => void {
  if (!messaging) return () => {};
  return messaging.onMessage(messaging.getMessaging(), listener);
}
