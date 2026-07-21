# Settings

## User goal

The Settings tab presents the intended controls for reminder timing, notification frequency, location alerts and quiet hours, interests, screen theme, social connections, and account management.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Open Settings | `Functional` | Settings is a bottom-tab destination (`/settings`) alongside Home and Archive. |
| Select screen theme (시스템/라이트/다크) | `Functional` | The choice applies immediately app-wide, persists across restarts, and `system` follows the OS appearance. |
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

The screen-theme control is the exception: its state lives in the persisted theme-mode store in `src/shared/ui/theme` (`useThemeMode`/`useSetThemeMode`), because the theme system in shared is the lowest common owner consumed by every themed component. Persistence goes through the SecureStore adapter in `src/shared/lib/secure-storage` (localStorage on web). The page otherwise imports only shared theme and typography modules.

The location-alert, quiet-hours, and interests controls are owned by `src/features/notification-settings`. The page renders the controls and consumes the feature's hooks (`useNotificationEnabled`/`useSetNotificationEnabled`, `useQuietStart`/`useQuietEnd`/`useSetQuietStart`/`useSetQuietEnd`, `useInterests`/`useToggleInterest`, plus `INTEREST_OPTIONS`), mirroring the theme-mode arrangement. The feature persists a Zustand store through the same SecureStore adapter (`snaply.notification-settings`). These preferences map to the backend user fields (`notification_enabled`, `quiet_start`, `quiet_end`, `interests`) but are local-only until `PATCH /auth/me` exists. The location-alert switch (`notification_enabled`) is now consumed: `src/_app/providers` renders a headless `GeofenceGate` that reads `useNotificationEnabled` and drives `src/features/geofence-monitor` (`useGeofenceMonitoring`), which the two features cannot do directly because sibling features must not import each other. Quiet hours and interests are still not consumed on the client — the backend enforces them when it decides whether to send the arrival push.

## Known limitations and implementation requirements

- The morning/lunch/evening windows and daily-frequency choices do not survive navigation or application restart; the screen-theme, location-alert, quiet-hours, and interests choices do.
- The location-alert switch now starts/stops geofence monitoring, but the location-alert, quiet-hours, and interests preferences are still not synced to the backend (`PATCH /auth/me`); quiet hours and interests are enforced server-side when the arrival push is decided.
- Geofence monitoring needs foreground + background ("항상 허용") location permission; if the user declines, toggling the switch on cannot start monitoring. Requesting the position and nearby points also needs a network/location fix, so there is a short delay before monitoring begins.
- On Android 13+, showing a delivered notification also requires the `POST_NOTIFICATIONS` runtime permission (separate from these preferences).
- `expo-notifications` is now used to present foreground push messages locally (FCM suppresses the system banner while the app is foregrounded); this is wired in `src/features/register-push-token`, not this screen. Displaying it requires the app to have been rebuilt with the `expo-notifications` native module present.
- Push (FCM) requires the `@react-native-firebase` native modules, which Expo Go does not bundle. The messaging adapter (`src/shared/lib/notifications/messaging.ts`) loads Firebase lazily and degrades to inert stubs when the native module is absent — in Expo Go (or a dev client built before Firebase was added) push registration is silently skipped instead of crashing at startup, with a dev-only console warning.
- Social connections do not use authentication or external APIs.
- Log out is functional against the local session, but the session identity itself is still a mock and no backend is involved (see [Authentication](authentication.md)). Account deletion remains a no-op.

When a control becomes functional, document its persistence owner, permission behavior, external service, loading and error states, and platform support here. If the same action gains another consumer, evaluate a feature extraction using the project workflow rather than moving all settings code preemptively.
