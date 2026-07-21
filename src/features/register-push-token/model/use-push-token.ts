import { useEffect } from 'react';

import { useIsAuthenticated } from '@/entities/session';
import {
  configureForegroundNotifications,
  ensureNotificationChannel,
  getFcmToken,
  onFcmTokenRefresh,
  onForegroundMessage,
  presentLocalNotification,
  registerForRemoteMessages,
  requestNotificationPermission,
} from '@/shared/lib/notifications';

import { registerFcmToken } from '../api/register-fcm-token';

/**
 * Acquire the device's FCM token and keep it registered with the backend.
 *
 * Runs only while authenticated, because `POST /auth/fcm-token` ties the token
 * to the current user. On sign-in it requests permission, registers with APNs
 * (iOS), reads the token, and registers it; it then re-registers on token
 * refresh. Foreground messages are presented as a local notification, since FCM
 * suppresses the system banner while the app is foregrounded.
 */
export function usePushTokenRegistration(): void {
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const unsubscribers: (() => void)[] = [];

    void (async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted || cancelled) return;

        // Present foreground messages ourselves; without this handler+channel a
        // notification arriving while the app is open is delivered silently.
        configureForegroundNotifications();
        await ensureNotificationChannel();
        if (cancelled) return;

        await registerForRemoteMessages();
        const token = await getFcmToken();
        if (cancelled) return;
        await registerFcmToken(token);

        unsubscribers.push(
          onFcmTokenRefresh((refreshed) => {
            void registerFcmToken(refreshed);
          }),
        );
        unsubscribers.push(
          onForegroundMessage((message) => {
            const notification = message.notification;
            if (!notification) return;
            void presentLocalNotification({
              title: notification.title,
              body: notification.body,
              data: message.data,
            });
          }),
        );
      } catch (error) {
        if (__DEV__) console.warn('[push] token registration failed:', String(error));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [isAuthenticated]);
}
