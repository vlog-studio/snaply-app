import type { Location } from '@/entities/location';
import {
  hasStartedGeofencing,
  requestBackgroundLocationPermission,
  requestForegroundLocationPermission,
  startGeofencing,
  stopGeofencing,
} from '@/shared/lib/location';

import { selectNearestRegions } from '../lib/select-nearest-regions';
import {
  ensureGeofencePermissions,
  startGeofenceMonitoring,
  stopGeofenceMonitoring,
} from './geofence-monitor';
import { GEOFENCE_TASK_NAME } from './geofence-task';

jest.mock('@/shared/lib/location', () => ({
  hasStartedGeofencing: jest.fn(),
  requestBackgroundLocationPermission: jest.fn(),
  requestForegroundLocationPermission: jest.fn(),
  startGeofencing: jest.fn(),
  stopGeofencing: jest.fn(),
}));

jest.mock('./geofence-task', () => ({
  GEOFENCE_TASK_NAME: 'snaply-geofence-monitor',
}));

const foregroundPermission = requestForegroundLocationPermission as jest.MockedFunction<
  typeof requestForegroundLocationPermission
>;
const backgroundPermission = requestBackgroundLocationPermission as jest.MockedFunction<
  typeof requestBackgroundLocationPermission
>;
const hasStarted = hasStartedGeofencing as jest.MockedFunction<typeof hasStartedGeofencing>;
const start = startGeofencing as jest.MockedFunction<typeof startGeofencing>;
const stop = stopGeofencing as jest.MockedFunction<typeof stopGeofencing>;

const origin = { latitude: 37.5, longitude: 127 };
const nearby: Location[] = [
  {
    id: 'loc-1',
    name: 'Nearby',
    latitude: 37.501,
    longitude: 127,
    radiusMeters: 200,
    category: 'test',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  foregroundPermission.mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: 'granted' as Awaited<ReturnType<typeof requestForegroundLocationPermission>>['status'],
    expires: 'never',
  });
  backgroundPermission.mockResolvedValue({
    granted: true,
    canAskAgain: true,
    status: 'granted' as Awaited<ReturnType<typeof requestBackgroundLocationPermission>>['status'],
    expires: 'never',
  });
  hasStarted.mockResolvedValue(false);
  start.mockResolvedValue(undefined);
  stop.mockResolvedValue(undefined);
});

describe('ensureGeofencePermissions', () => {
  it('stops before requesting background access when foreground access is denied', async () => {
    foregroundPermission.mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: 'denied' as Awaited<ReturnType<typeof requestForegroundLocationPermission>>['status'],
      expires: 'never',
    });

    await expect(ensureGeofencePermissions()).resolves.toMatchObject({
      granted: false,
      reason: 'foreground-denied',
      canAskAgain: false,
    });
    expect(backgroundPermission).not.toHaveBeenCalled();
  });

  it('distinguishes a background denial after foreground access succeeds', async () => {
    backgroundPermission.mockResolvedValue({
      granted: false,
      canAskAgain: true,
      status: 'denied' as Awaited<ReturnType<typeof requestBackgroundLocationPermission>>['status'],
      expires: 'never',
    });

    await expect(ensureGeofencePermissions()).resolves.toMatchObject({
      granted: false,
      reason: 'background-denied',
      canAskAgain: true,
    });
  });

  it('grants monitoring only after both permission levels succeed', async () => {
    await expect(ensureGeofencePermissions()).resolves.toEqual({ granted: true });
    expect(foregroundPermission).toHaveBeenCalledTimes(1);
    expect(backgroundPermission).toHaveBeenCalledTimes(1);
  });
});

describe('geofence monitoring lifecycle', () => {
  it('replaces the active native region set with the nearest current locations', async () => {
    hasStarted.mockResolvedValue(true);

    await startGeofenceMonitoring(nearby, origin);

    expect(stop).toHaveBeenCalledWith(GEOFENCE_TASK_NAME);
    expect(start).toHaveBeenCalledWith(GEOFENCE_TASK_NAME, selectNearestRegions(nearby, origin));
    expect(stop.mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0]);
  });

  it('does not disturb native monitoring when there are no candidate locations', async () => {
    await startGeofenceMonitoring([], origin);

    expect(hasStarted).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('stops only when the geofence task is active', async () => {
    await stopGeofenceMonitoring();
    expect(stop).not.toHaveBeenCalled();

    hasStarted.mockResolvedValue(true);
    await stopGeofenceMonitoring();
    expect(stop).toHaveBeenCalledWith(GEOFENCE_TASK_NAME);
  });
});
