# Location alerts and push notifications

## User goal

While signed in, Snaply can notify the user when they arrive near a nearby capture spot ("주변 촬영 스팟"). The device registers for push, monitors the nearest points in the background, and reports arrivals so the backend can send an arrival push. The user's preference for this — the master switch, quiet hours, and interests — lives in [Settings](settings.md); this document owns the mechanism those preferences drive.

The end-to-end product effect (an actual push landing on arrival) is decided and sent by the backend, which does not exist yet. On the client, push-token registration and OS geofence monitoring run for real against mock endpoints.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Register the device for push (FCM) | `Partial` | While authenticated, the app requests notification permission, registers with APNs (iOS), reads the FCM token, and posts it to `POST /auth/fcm-token`; it re-posts on token refresh. Routes to a mock until an API origin is configured. Native only. |
| Present a foreground push | `Partial` | A message arriving while the app is foregrounded is re-presented as a local notification (`expo-notifications`), because FCM suppresses the system banner in the foreground. Requires the `expo-notifications` native module to be present in the build. |
| Start/stop geofence monitoring | `Functional` | Turning 위치 알림 받기 on (authenticated, with foreground **and** background location permission) resolves the current position, loads nearby points, and starts OS geofencing on the nearest ones; turning it off stops all monitoring. Native only. |
| Report an arrival | `Partial` | On a geofence *enter* event the app posts the location id to `POST /notifications/geofence-enter`, even when relaunched headlessly in the background. Routes to a mock until an API origin is configured; the backend that turns a report into a push does not exist yet. |
| Receive an arrival push | Not implemented | The backend owns the authoritative decision (30-minute per-(user, location) dedup, quiet hours, `notification_enabled`) and the send. No backend, so no arrival push is delivered end-to-end. |

## Route and entry points

There is no screen or route for this feature. It is composed headlessly at the app layer and driven by app lifecycle and OS events:

- `src/_app/providers/app-providers.tsx` renders `<PushTokenRegistrar />` and `<GeofenceGate />` once, high in the tree, for the whole authenticated session.
- `src/_app/routes/register-background-tasks.ts` is a side-effect import from `src/_app/routes/root-layout.tsx`. It runs `TaskManager.defineTask` at global scope so the geofence task is defined at startup — including when the OS relaunches the app headlessly on a geofence event, before any screen mounts.
- The master switch that gates all of it is the 위치 알림 받기 control in [Settings](settings.md).

## Ownership and state

| Layer | Module | Responsibility |
| --- | --- | --- |
| `src/_app/providers` | `geofence-gate.tsx` | Headless bridge: reads `useNotificationEnabled` (notification-settings) and drives `useGeofenceMonitoring` (geofence-monitor). The two features must not import each other, so the app layer composes them. |
| `src/_app/providers` | `app-providers.tsx` | Mounts `PushTokenRegistrar` and `GeofenceGate`. |
| `src/_app/routes` | `register-background-tasks.ts` | Side-effect import that defines the background geofence task at startup. |
| `src/features/register-push-token` | `ui/push-token-registrar.tsx`, `model/use-push-token.ts`, `api/register-fcm-token.ts` | Acquire and keep the FCM token registered while authenticated; present foreground messages locally; `POST /auth/fcm-token` (mock-routed). |
| `src/features/geofence-monitor` | `model/use-geofence-monitoring.ts` | Bridge the `enabled` preference to OS geofencing: ensure permissions, resolve position, load nearby points, start/stop monitoring. Native only. |
| `src/features/geofence-monitor` | `model/geofence-monitor.ts` | Product-level permission flow (foreground then background "항상 허용", with Korean copy) and start/stop that always replaces the active region set. |
| `src/features/geofence-monitor` | `model/geofence-task.ts` | `defineTask` at global scope; on *enter* applies a 5-minute in-memory client cooldown and calls `reportGeofenceEnter`. |
| `src/features/geofence-monitor` | `lib/select-nearest-regions.ts` | Haversine sort + cap at `MAX_MONITORED_REGIONS` (20, the stricter iOS ceiling), mapped to `expo-location` regions with `notifyOnEnter` only. |
| `src/features/geofence-monitor` | `api/report-geofence-enter.ts` | `POST /notifications/geofence-enter` (mock-routed). |
| `src/features/notification-settings` | `model/*` | Owns the `notification_enabled` / `quiet_start` / `quiet_end` / `interests` preferences (persisted Zustand store). Surfaced in [Settings](settings.md). |
| `src/entities/location` | `model/location.ts`, `api/*` | The geofence-point domain model and `GET /locations` reads (DTO validation + mapping, TanStack Query options, in-code mock). |
| `src/shared/lib/notifications` | `messaging.ts`, `local.ts` (+ `.web`) | Platform adapters for FCM (permission, remote registration, token, refresh/foreground subscriptions) and local notification presentation. Firebase is loaded lazily and degrades to inert stubs when the native module is absent. |
| `src/shared/lib/location` | `permissions.ts`, `geofencing.ts`, `current-position.ts` | Raw `expo-location` permission, geofencing, and current-position calls. |

Backend fields these map to: `POST /auth/fcm-token` (raw token), `POST /notifications/geofence-enter` (`locationId`), `GET /locations` (`lat`/`lng`/`radius`), and the user-profile fields enforced server-side (`notification_enabled`, `quiet_start`, `quiet_end`, `interests`).

## Platform support

- **iOS / Android**: push registration and geofence monitoring run natively.
- **Web**: geofencing is skipped (`useGeofenceMonitoring` returns early, no task is defined) and the notification adapters are inert web stubs.
- **Expo Go**: `@react-native-firebase` is not bundled, so the messaging adapter degrades to inert stubs and push registration is silently skipped with a dev-only warning instead of crashing at startup. Geofencing needs a dev/release build with the native modules present.

## Known limitations and implementation requirements

- No backend exists: arrival reports and token registrations go to mocks (`USE_MOCK_API`), and no arrival push is delivered end-to-end. Presenting a foreground push has been wired but end-to-end FCM display is unverified pending the backend notification API.
- Geofence monitoring needs foreground **and** background ("항상 허용") location permission. If the user declines, toggling the switch on cannot start monitoring. Resolving the position and nearby points also needs a location/network fix, so there is a short delay before monitoring begins.
- On Android 13+, presenting a delivered notification also requires the `POST_NOTIFICATIONS` runtime permission (separate from location permission).
- At most `MAX_MONITORED_REGIONS` (20) points are monitored at once, the nearest to the resolved position; the set is recomputed each time monitoring (re)starts.
- The 5-minute client cooldown is in-memory only and resets on a cold background relaunch; the authoritative 30-minute per-(user, location) dedup is the backend's responsibility.
- Quiet hours and interests are collected locally but not synced to the backend (`PATCH /auth/me` does not exist); they are enforced server-side when the arrival push is decided (see [Settings](settings.md)).

When the backend arrives, replace the mock routes, verify end-to-end FCM display, move `notification_enabled`/`quiet_start`/`quiet_end`/`interests` to server-backed queries/mutations, and update the status of the rows above with the verified success and failure paths.
