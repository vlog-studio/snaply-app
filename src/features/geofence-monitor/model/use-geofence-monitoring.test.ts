import { useQueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { locationQueries } from '@/entities/location';
import { useIsAuthenticated } from '@/entities/session';
import { getCurrentCoordinates } from '@/shared/lib/location';

import {
  ensureGeofencePermissions,
  startGeofenceMonitoring,
  stopGeofenceMonitoring,
} from './geofence-monitor';
import { useGeofenceMonitoring } from './use-geofence-monitoring';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

jest.mock('@tanstack/react-query', () => ({ useQueryClient: jest.fn() }));

jest.mock('@/entities/session', () => ({ useIsAuthenticated: jest.fn() }));

jest.mock('@/entities/location', () => ({
  locationQueries: { nearby: jest.fn((params) => ({ queryKey: ['nearby', params], queryFn: jest.fn() })) },
}));

jest.mock('@/shared/lib/location', () => ({ getCurrentCoordinates: jest.fn() }));

jest.mock('./geofence-monitor', () => ({
  ensureGeofencePermissions: jest.fn(),
  startGeofenceMonitoring: jest.fn(),
  stopGeofenceMonitoring: jest.fn(),
}));

const origin = { latitude: 37.5, longitude: 127.0 };
const nearbyLocations = [{ id: 'loc-1' }];
const fetchQuery = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (Platform as { OS: string }).OS = 'ios';
  (useQueryClient as jest.Mock).mockReturnValue({ fetchQuery });
  (useIsAuthenticated as jest.Mock).mockReturnValue(true);
  (ensureGeofencePermissions as jest.Mock).mockResolvedValue({ granted: true });
  (getCurrentCoordinates as jest.Mock).mockResolvedValue(origin);
  fetchQuery.mockResolvedValue(nearbyLocations);
  (startGeofenceMonitoring as jest.Mock).mockResolvedValue(undefined);
  (stopGeofenceMonitoring as jest.Mock).mockResolvedValue(undefined);
});

describe('useGeofenceMonitoring', () => {
  it('starts monitoring nearby points when authenticated and enabled', async () => {
    await renderHook(() => useGeofenceMonitoring({ enabled: true }));

    await waitFor(() => expect(startGeofenceMonitoring).toHaveBeenCalledWith(nearbyLocations, origin));
    expect(locationQueries.nearby).toHaveBeenCalledWith(origin);
    expect(stopGeofenceMonitoring).not.toHaveBeenCalled();
  });

  it('stops monitoring when the location-alert setting is disabled', async () => {
    await renderHook(() => useGeofenceMonitoring({ enabled: false }));

    await waitFor(() => expect(stopGeofenceMonitoring).toHaveBeenCalled());
    expect(ensureGeofencePermissions).not.toHaveBeenCalled();
    expect(startGeofenceMonitoring).not.toHaveBeenCalled();
  });

  it('stops monitoring when not authenticated even if enabled', async () => {
    (useIsAuthenticated as jest.Mock).mockReturnValue(false);

    await renderHook(() => useGeofenceMonitoring({ enabled: true }));

    await waitFor(() => expect(stopGeofenceMonitoring).toHaveBeenCalled());
    expect(startGeofenceMonitoring).not.toHaveBeenCalled();
  });

  it('does not start monitoring when location permission is denied', async () => {
    (ensureGeofencePermissions as jest.Mock).mockResolvedValue({
      granted: false,
      reason: 'background-denied',
      canAskAgain: false,
      message: 'denied',
    });

    await renderHook(() => useGeofenceMonitoring({ enabled: true }));

    await waitFor(() => expect(ensureGeofencePermissions).toHaveBeenCalled());
    expect(startGeofenceMonitoring).not.toHaveBeenCalled();
  });

  it('is a no-op on web', async () => {
    (Platform as { OS: string }).OS = 'web';

    await renderHook(() => useGeofenceMonitoring({ enabled: true }));

    await waitFor(() => expect(useQueryClient).toHaveBeenCalled());
    expect(ensureGeofencePermissions).not.toHaveBeenCalled();
    expect(startGeofenceMonitoring).not.toHaveBeenCalled();
    expect(stopGeofenceMonitoring).not.toHaveBeenCalled();
  });
});
