# Me tab

## User goal

The 나 tab (`/me`) shows who you are and what you have made, and holds every preference: reminder timing, notification frequency, location alerts, quiet hours, interests, social connections, and account management.

It was a stack screen reached from a corner control on the old Archive; the four-tab structure has room for it, and a settings screen the user cannot find is a settings screen that does not exist.

This document owns these controls and their persistence. The push/geofence mechanism the location-alert, quiet-hours, and interests preferences drive is owned by [Location alerts and push notifications](location-and-push-notifications.md).

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Open the tab | `Functional` | `/me` is the fourth bottom tab. |
| Profile header | `Partial` | Shows the signed-in user's initial and display name, or "로그인하지 않음" with no session. The identity comes from `entities/session`. |
| Snap / movie / tray counts | `Functional` | Read live from `entities/snap`, `entities/movie`, and `entities/tray`. |
| Toggle morning, lunch, and evening windows | `Prototype` | Values update only in component-local state and reset when the screen remounts. |
| Select one to three reminders per day | `Prototype` | The selection is local UI state and does not schedule notifications. |
| Toggle location alerts (위치 알림 받기) | `Functional` | The master switch persists across restarts (SecureStore) and gates OS geofencing: turning it on (while signed in, with location permission granted) starts monitoring the nearest points; turning it off stops monitoring so no arrivals are reported. Backend sync (`PATCH /auth/me`) does not exist yet. Native only — no effect on web. |
| Toggle movie-completion alerts (무비 완성 알림) | `Prototype` | Local state only. Nothing publishes a "movie is ready" push yet, because nothing generates a movie yet; the row states this. It is wired to the real notification path in the final stage of the rebuild. |
| Set quiet hours (조용한 시간 시작/종료) | `Partial` | Start/end hours (0–23) persist across restarts; not yet synced to the backend `quiet_start`/`quiet_end` that enforces them. |
| Select interests (관심사) | `Partial` | Multi-select tags persist across restarts; not yet synced to `users.interests` for personalization. |
| TikTok connection state | `Prototype` | "Connected" is a static initial label; the disconnect control has no action. |
| Instagram connection | `Prototype` | The connect control has no action. |
| Log out | `Functional` | Clears the persisted session via the session entity, which returns the user to `/sign-in`. |
| Delete account | `Prototype` | The control has no action or confirmation flow. |

## Ownership and state

`src/pages/me` owns the screen and the local presentation state of the prototype sections. The profile and account sections read the current user through `src/entities/session` (`useCurrentUser`) and sign out through the same entity (`useClearSession`); the stat row reads the three content stores directly. There is no settings entity, form schema, notification scheduler, or social-auth adapter connected to this page.

The app is dark-fixed, so the page exposes no theme control — `useTheme`/`useResolvedColorScheme` always resolve to the one palette.

The location-alert, quiet-hours, and interests controls are owned by `src/features/notification-settings`. The page renders the controls and consumes the feature's hooks (`useNotificationEnabled`/`useSetNotificationEnabled`, `useQuietStart`/`useQuietEnd`/`useSetQuietStart`/`useSetQuietEnd`, `useInterests`/`useToggleInterest`, plus `INTEREST_OPTIONS`). The feature persists a Zustand store through the SecureStore adapter (`snaply.notification-settings`). These preferences map to the backend user fields (`notification_enabled`, `quiet_start`, `quiet_end`, `interests`) but are local-only until `PATCH /auth/me` exists. How the location-alert switch (`notification_enabled`) drives OS geofencing — the headless `GeofenceGate`, permissions, and arrival reporting — is documented in [Location alerts and push notifications](location-and-push-notifications.md); quiet hours and interests are not consumed on the client and are enforced server-side when the arrival push is decided.

The reminder copy still speaks of suggesting good moments to shoot, which the redesign keeps: the capture reminder is the app's only nudge to shoot now that automatic collection is gone (concept §7).

## Known limitations and implementation requirements

- The morning/lunch/evening windows, daily-frequency choice, and movie-completion switch do not survive navigation or application restart; the location-alert, quiet-hours, and interests choices do.
- The location-alert switch starts/stops geofence monitoring, but none of these preferences are synced to the backend (`PATCH /auth/me`); quiet hours and interests are enforced server-side when the arrival push is decided.
- Turning the location-alert switch on requires foreground + background ("항상 허용") location permission; if the user declines, monitoring cannot start. The geofence and push mechanism, its platform/permission caveats (including Android 13+ `POST_NOTIFICATIONS` and Expo Go's missing Firebase modules), and foreground-notification presentation are documented in [Location alerts and push notifications](location-and-push-notifications.md).
- Social connections do not use authentication or external APIs.
- Log out is functional against the local session; account deletion remains a no-op.

When a control becomes functional, document its persistence owner, permission behavior, external service, loading and error states, and platform support here.
