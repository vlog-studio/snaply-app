# Settings

## User goal

The Settings tab presents the intended controls for reminder timing, notification frequency, location alerts and quiet hours, interests, social connections, and account management.

This document owns the Settings controls and their persistence. The push/geofence mechanism the location-alert, quiet-hours, and interests preferences drive is owned by [Location alerts and push notifications](location-and-push-notifications.md).

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Open Settings | `Functional` | Settings is a bottom-tab destination (`/settings`) alongside Home and Archive. |
| Toggle morning, lunch, and evening windows | `Prototype` | Values update only in component-local state and reset when the screen remounts. |
| Select one to three reminders per day | `Prototype` | The selection is local UI state and does not schedule notifications. |
| Toggle location alerts (위치 알림 받기) | `Functional` | The master switch persists across restarts (SecureStore) and gates OS geofencing: turning it on (while signed in, with location permission granted) starts monitoring the nearest points; turning it off stops monitoring so no arrivals are reported. Backend sync (`PATCH /auth/me`) does not exist yet. Native only — no effect on web. |
| Set quiet hours (조용한 시간 시작/종료) | `Partial` | Start/end hours (0–23) persist across restarts; not yet synced to the backend `quiet_start`/`quiet_end` that enforces them. |
| Select interests (관심사) | `Partial` | Multi-select tags persist across restarts; not yet synced to `users.interests` for personalization. |
| TikTok connection state | `Prototype` | “Connected” is a static initial label; the disconnect control has no action. |
| Instagram connection | `Prototype` | The connect control has no action. |
| Show the signed-in account | `Partial` | When a session exists, the account section shows the current user's display name; the underlying identity is still a mock (see [Authentication](authentication.md)). |
| Log out | `Functional` | Clears the persisted session via the session entity, which returns the user to `/sign-in`. |
| Delete account | `Prototype` | The control has no action or confirmation flow. |

## Ownership and state

`src/pages/settings` owns the screen and the local presentation state of the prototype sections. The account section is the exception: it reads the current user through `src/entities/session` (`useCurrentUser`) and signs out through the same entity (`useClearSession`). There is currently no settings entity, form schema, notification scheduler, or social-auth adapter connected to this page; the reminder and social-connection sections remain local prototype state.

The app is now dark-fixed (the "darkroom", per the moment-collection redesign), so Settings no longer exposes a screen-theme control. The theme-mode store in `src/shared/ui/theme` (`useThemeMode`/`useSetThemeMode`) still exists and stays persisted, but nothing consumes it for rendering — `useTheme`/`useResolvedColorScheme` always resolve to the dark darkroom palette. The page otherwise imports only shared theme and typography modules.

The location-alert, quiet-hours, and interests controls are owned by `src/features/notification-settings`. The page renders the controls and consumes the feature's hooks (`useNotificationEnabled`/`useSetNotificationEnabled`, `useQuietStart`/`useQuietEnd`/`useSetQuietStart`/`useSetQuietEnd`, `useInterests`/`useToggleInterest`, plus `INTEREST_OPTIONS`), mirroring the theme-mode arrangement. The feature persists a Zustand store through the same SecureStore adapter (`snaply.notification-settings`). These preferences map to the backend user fields (`notification_enabled`, `quiet_start`, `quiet_end`, `interests`) but are local-only until `PATCH /auth/me` exists. How the location-alert switch (`notification_enabled`) drives OS geofencing — the headless `GeofenceGate`, permissions, and arrival reporting — is documented in [Location alerts and push notifications](location-and-push-notifications.md); quiet hours and interests are not consumed on the client and are enforced server-side when the arrival push is decided.

## Known limitations and implementation requirements

- The morning/lunch/evening windows and daily-frequency choices do not survive navigation or application restart; the location-alert, quiet-hours, and interests choices do.
- The location-alert switch now starts/stops geofence monitoring, but the location-alert, quiet-hours, and interests preferences are still not synced to the backend (`PATCH /auth/me`); quiet hours and interests are enforced server-side when the arrival push is decided.
- Turning the location-alert switch on requires foreground + background ("항상 허용") location permission; if the user declines, monitoring cannot start. The geofence and push mechanism, its platform/permission caveats (including Android 13+ `POST_NOTIFICATIONS` and Expo Go's missing Firebase modules), and foreground-notification presentation are documented in [Location alerts and push notifications](location-and-push-notifications.md).
- Social connections do not use authentication or external APIs.
- Log out is functional against the local session, but the session identity itself is still a mock and no backend is involved (see [Authentication](authentication.md)). Account deletion remains a no-op.

When a control becomes functional, document its persistence owner, permission behavior, external service, loading and error states, and platform support here. If the same action gains another consumer, evaluate a feature extraction using the project workflow rather than moving all settings code preemptively.
