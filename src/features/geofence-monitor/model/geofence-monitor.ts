import {
  hasStartedGeofencing,
  requestBackgroundLocationPermission,
  requestForegroundLocationPermission,
  startGeofencing,
  stopGeofencing,
} from '@/shared/lib/location';
import type { Location } from '@/entities/location';

import { selectNearestRegions } from '../lib/select-nearest-regions';
import { GEOFENCE_TASK_NAME } from './geofence-task';

type Origin = { latitude: number; longitude: number };

export type LocationPermissionResult =
  | { granted: true }
  | {
      granted: false;
      reason: 'foreground-denied' | 'background-denied';
      /** Whether the OS will still show a prompt (false → must open Settings). */
      canAskAgain: boolean;
      /** User-facing Korean copy explaining what is needed and why. */
      message: string;
    };

/**
 * Request the permissions geofencing needs, foreground first then background
 * ("Always" on iOS). Owns the product flow and user-facing copy; the raw native
 * calls live in `shared/lib/location`.
 */
export async function ensureGeofencePermissions(): Promise<LocationPermissionResult> {
  const foreground = await requestForegroundLocationPermission();
  if (!foreground.granted) {
    return {
      granted: false,
      reason: 'foreground-denied',
      canAskAgain: foreground.canAskAgain,
      message: '위치 권한을 허용해야 주변 촬영 스팟 알림을 받을 수 있어요.',
    };
  }

  const background = await requestBackgroundLocationPermission();
  if (!background.granted) {
    return {
      granted: false,
      reason: 'background-denied',
      canAskAgain: background.canAskAgain,
      message:
        '백그라운드 위치 권한(항상 허용)이 필요해요. 앱을 보고 있지 않아도 주변 스팟에 도착하면 알림을 보내드려요.',
    };
  }

  return { granted: true };
}

/**
 * Start monitoring arrivals for the nearest points to `origin`. Replaces any
 * existing monitoring so the active region set always reflects the latest
 * `locations`. No-op when there is nothing nearby to monitor. Assumes
 * permissions are already granted (see `ensureGeofencePermissions`).
 */
export async function startGeofenceMonitoring(
  locations: Location[],
  origin: Origin,
): Promise<void> {
  const regions = selectNearestRegions(locations, origin);
  if (regions.length === 0) return;

  if (await hasStartedGeofencing(GEOFENCE_TASK_NAME)) {
    await stopGeofencing(GEOFENCE_TASK_NAME);
  }
  await startGeofencing(GEOFENCE_TASK_NAME, regions);
}

/** Stop all arrival monitoring, if any is active. */
export async function stopGeofenceMonitoring(): Promise<void> {
  if (await hasStartedGeofencing(GEOFENCE_TASK_NAME)) {
    await stopGeofencing(GEOFENCE_TASK_NAME);
  }
}
