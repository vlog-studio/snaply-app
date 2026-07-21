import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '@/shared/lib/secure-storage';

/**
 * Owns the user's location-alert preferences. These map to the backend user
 * profile fields (`notification_enabled`, `quiet_start`, `quiet_end`,
 * `interests`) and are persisted locally for now; once `PATCH /auth/me` exists,
 * this becomes a server-backed query/mutation and the local store is dropped.
 *
 * Quiet hours are stored as integer hours (0–23), matching the backend.
 */
type NotificationSettingsState = {
  enabled: boolean;
  quietStart: number;
  quietEnd: number;
  interests: string[];
  setEnabled: (enabled: boolean) => void;
  setQuietStart: (hour: number) => void;
  setQuietEnd: (hour: number) => void;
  toggleInterest: (interest: string) => void;
};

const useNotificationSettingsStore = create<NotificationSettingsState>()(
  persist(
    (set) => ({
      enabled: true,
      quietStart: 22,
      quietEnd: 8,
      interests: [],
      setEnabled: (enabled) => set({ enabled }),
      setQuietStart: (quietStart) => set({ quietStart }),
      setQuietEnd: (quietEnd) => set({ quietEnd }),
      toggleInterest: (interest) =>
        set((state) => ({
          interests: state.interests.includes(interest)
            ? state.interests.filter((item) => item !== interest)
            : [...state.interests, interest],
        })),
    }),
    {
      name: 'snaply.notification-settings',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);

export function useNotificationEnabled(): boolean {
  return useNotificationSettingsStore((state) => state.enabled);
}

export function useSetNotificationEnabled(): (enabled: boolean) => void {
  return useNotificationSettingsStore((state) => state.setEnabled);
}

export function useQuietStart(): number {
  return useNotificationSettingsStore((state) => state.quietStart);
}

export function useQuietEnd(): number {
  return useNotificationSettingsStore((state) => state.quietEnd);
}

export function useSetQuietStart(): (hour: number) => void {
  return useNotificationSettingsStore((state) => state.setQuietStart);
}

export function useSetQuietEnd(): (hour: number) => void {
  return useNotificationSettingsStore((state) => state.setQuietEnd);
}

export function useInterests(): string[] {
  return useNotificationSettingsStore((state) => state.interests);
}

export function useToggleInterest(): (interest: string) => void {
  return useNotificationSettingsStore((state) => state.toggleInterest);
}
