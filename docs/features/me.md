# Me tab

## User goal

The 나 tab (`/me`) shows who you are and what you have made, and holds every preference: reminder timing, notification frequency, movie-completion alerts, location alerts, quiet hours, interests, social connections, and account management.

It was a stack screen reached from a corner control on the old Archive; the four-tab structure has room for it, and a settings screen the user cannot find is a settings screen that does not exist.

This document owns these controls and their persistence. The push/geofence mechanism the location-alert, quiet-hours, and interests preferences drive is owned by [Location alerts and push notifications](location-and-push-notifications.md).

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Open the tab | `Functional` | `/me` is the fourth bottom tab. |
| Profile header | `Partial` | Shows the signed-in user's initial and display name, or "로그인하지 않음" with no session. The identity comes from `entities/session`. |
| Snap / movie / tray counts | `Functional` | Read live from `entities/snap`, `entities/movie`, and `entities/tray`. |
| Choose the app theme (화면 테마) | `Functional` | A three-way radio (시스템/라이트/다크) sets the theme mode. The choice persists across restarts (SecureStore, `snaply.theme-mode`, default 시스템) and takes effect immediately — every screen except the dark-pinned viewfinder re-resolves its palette. |
| Toggle morning, lunch, and evening windows | `Prototype` | Values update only in component-local state and reset when the screen remounts. |
| Select one to three reminders per day | `Prototype` | The selection is local UI state and does not schedule notifications. |
| Toggle location alerts (위치 알림 받기) | `Functional` | The master switch persists across restarts (SecureStore) and gates OS geofencing: turning it on (while signed in, with location permission granted) starts monitoring the nearest points; turning it off stops monitoring so no arrivals are reported. Backend sync is not wired yet — `PATCH /auth/me` is in the API spec, but no client code calls it. Native only — no effect on web. |
| Toggle movie-completion alerts (무비 완성 알림) | `Partial` | Persists across restarts (SecureStore) and gates a real notification: with it on, a generation job that ends while the app is running presents a local notification ("무비가 완성됐어요" / "무비를 만들지 못했어요"). Turning it on requests the OS notification permission; a refusal leaves the switch off and the row says so. Native only. Nothing arrives while the app is force-quit — the run continues on the backend, but the notification is raised by the app when it *learns* the run ended, so a force-quit app announces on its next start's catch-up pass — see [The movie screen](movie.md). |
| Set quiet hours (조용한 시간 시작/종료) | `Partial` | Start/end hours (0–23) persist across restarts; not yet synced to the backend `quiet_start`/`quiet_end` that enforces them. |
| Select interests (관심사) | `Partial` | Multi-select tags persist across restarts; not yet synced to `users.interests` for personalization. |
| TikTok connection state | `Prototype` | "Connected" is a static initial label; the disconnect control has no action. |
| Instagram connection | `Prototype` | The connect control has no action. |
| Log out | `Functional` | Clears the persisted session via the session entity, which returns the user to `/sign-in`. |
| Delete account | `Prototype` | The control has no action or confirmation flow. |

## Ownership and state

`src/pages/me` owns the screen and the local presentation state of the prototype sections. The profile and account sections read the current user through `src/entities/session` (`useCurrentUser`) and sign out through the same entity (`useClearSession`); the stat row reads the three content stores directly. There is no settings entity, form schema, notification scheduler, or social-auth adapter connected to this page.

The 화면 테마 control is owned by `shared/ui/theme`'s theme-mode store (`useThemeMode`/`useSetThemeMode`); the page only renders the radio. Resolution order and the light/dark palettes are documented in [Application shell and navigation](app-shell-and-navigation.md).

The location-alert, quiet-hours, interests, and movie-completion controls are owned by `src/features/notification-settings`. The page renders the controls and consumes the feature's hooks (`useNotificationEnabled`/`useSetNotificationEnabled`, `useQuietStart`/`useQuietEnd`/`useSetQuietStart`/`useSetQuietEnd`, `useInterests`/`useToggleInterest`, `useMovieReadyAlerts`, plus `INTEREST_OPTIONS`). The feature persists a Zustand store through the SecureStore adapter (`snaply.notification-settings`). The first three map to the backend user fields (`notification_enabled`, `quiet_start`, `quiet_end`, `interests`) but are local-only: `GET|PATCH /auth/me` are in the API spec, but no client code binds them yet. How the location-alert switch (`notification_enabled`) drives OS geofencing — the headless `GeofenceGate`, permissions, and arrival reporting — is documented in [Location alerts and push notifications](location-and-push-notifications.md); quiet hours and interests are not consumed on the client and are enforced server-side when the arrival push is decided.

The movie-completion preference (`movieReady`) has no backend field: the run is remote, but the announcement is local — the app raises the notification when it learns the run ended, so the preference never needs to reach the server. `useMovieReadyAlerts` owns the rule that turning it on must first obtain the OS notification grant (`shared/lib/notifications`' `requestLocalNotificationPermission`) — a preference the device will never honor is not worth storing, and the request belongs to a control the user just touched rather than to a background timer. `src/_app/providers/movie-generation-bridge.tsx` reads the stored preference and passes it to `MovieGenerationGate`, the same app-layer composition `GeofenceGate` uses, because the two features must not import each other.

The reminder copy still speaks of suggesting good moments to shoot, which the redesign keeps: the capture reminder is the app's only nudge to shoot now that automatic collection is gone (concept §7).

## Known limitations and implementation requirements

- The morning/lunch/evening windows and the daily-frequency choice do not survive navigation or application restart; the theme, location-alert, movie-completion, quiet-hours, and interests choices do.
- The movie-completion notification is a **local** notification raised by the app when it learns the run ended, not a push from the server. The run itself survives a force-quit (it belongs to the backend), but the announcement does not: nothing is announced until the app is next opened, when the catch-up pass announces immediately; a job the user only backgrounded is announced when the app is next foregrounded, not while it is suspended. Tapping the notification opens the app but does not route to the movie — nothing subscribes to notification responses yet, though the movie id is carried in the payload for when something does.
- The location-alert switch starts/stops geofence monitoring, but none of these preferences are synced to the backend (`PATCH /auth/me` is in the spec, not yet called); quiet hours and interests are enforced server-side when the arrival push is decided.
- Turning the location-alert switch on requires foreground + background ("항상 허용") location permission; if the user declines, monitoring cannot start. The geofence and push mechanism, its platform/permission caveats (including Android 13+ `POST_NOTIFICATIONS` and Expo Go's missing Firebase modules), and foreground-notification presentation are documented in [Location alerts and push notifications](location-and-push-notifications.md).
- Social connections do not use authentication or external APIs.
- Log out is functional against the local session; account deletion remains a no-op.

When a control becomes functional, document its persistence owner, permission behavior, external service, loading and error states, and platform support here.
