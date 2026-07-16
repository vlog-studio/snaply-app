# Settings

## User goal

The Settings modal presents the intended controls for reminder timing, notification frequency, screen theme, social connections, and account management.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Open and dismiss Settings | `Functional` | Home opens `/settings`, presented as a root-stack modal. |
| Select screen theme (시스템/라이트/다크) | `Functional` | The choice applies immediately app-wide, persists across restarts, and `system` follows the OS appearance. |
| Toggle morning, lunch, and evening windows | `Prototype` | Values update only in component-local state and reset when the screen remounts. |
| Select one to three reminders per day | `Prototype` | The selection is local UI state and does not schedule notifications. |
| TikTok connection state | `Prototype` | “Connected” is a static initial label; the disconnect control has no action. |
| Instagram connection | `Prototype` | The connect control has no action. |
| Log out | `Prototype` | The control has no action. |
| Delete account | `Prototype` | The control has no action or confirmation flow. |

## Ownership and state

`src/pages/settings` owns the screen and the local presentation state of the prototype sections. There is currently no settings entity, feature slice, form schema, API, authentication session, notification scheduler, or social-auth adapter connected to this page.

The screen-theme control is the exception: its state lives in the persisted theme-mode store in `src/shared/ui/theme` (`useThemeMode`/`useSetThemeMode`), because the theme system in shared is the lowest common owner consumed by every themed component. Persistence goes through the SecureStore adapter in `src/shared/lib/secure-storage` (localStorage on web). The page otherwise imports only shared theme and typography modules.

## Known limitations and implementation requirements

- Reminder choices do not survive navigation or application restart; the screen-theme choice does.
- `expo-notifications` is installed but not used by this screen.
- Social connections do not use authentication or external APIs.
- Account actions do not use an authenticated user model or backend.

When a control becomes functional, document its persistence owner, permission behavior, external service, loading and error states, and platform support here. If the same action gains another consumer, evaluate a feature extraction using the project workflow rather than moving all settings code preemptively.
