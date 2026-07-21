import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { locationQueries } from '@/entities/location';
import { useIsAuthenticated } from '@/entities/session';
import { getCurrentCoordinates } from '@/shared/lib/location';

import {
  ensureGeofencePermissions,
  startGeofenceMonitoring,
  stopGeofenceMonitoring,
} from './geofence-monitor';

/**
 * Bridge the user's location-alert preference to OS geofencing. While the user
 * is authenticated and `enabled`, ensure permissions, resolve the current
 * position, load nearby points, and start monitoring; when either turns off,
 * stop monitoring so no arrivals are reported. Native-only (web has no
 * geofencing). The `enabled` value is supplied by the caller so this feature
 * does not depend on the notification-settings feature.
 */
export function useGeofenceMonitoring({ enabled }: { enabled: boolean }): void {
  const isAuthenticated = useIsAuthenticated();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const shouldMonitor = isAuthenticated && enabled;
    let cancelled = false;

    void (async () => {
      try {
        if (!shouldMonitor) {
          await stopGeofenceMonitoring();
          return;
        }

        const permission = await ensureGeofencePermissions();
        if (cancelled || !permission.granted) return;

        const origin = await getCurrentCoordinates();
        if (cancelled || !origin) return;

        const locations = await queryClient.fetchQuery(locationQueries.nearby(origin));
        if (cancelled) return;

        await startGeofenceMonitoring(locations, origin);
      } catch (error) {
        if (__DEV__) console.warn('[geofence] monitoring setup failed:', String(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, queryClient]);
}
