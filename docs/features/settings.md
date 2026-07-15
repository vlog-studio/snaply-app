# Settings

## User goal

The Settings modal presents the intended controls for reminder timing, notification frequency, social connections, and account management.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Open and dismiss Settings | `Functional` | Home opens `/settings`, presented as a root-stack modal. |
| Toggle morning, lunch, and evening windows | `Prototype` | Values update only in component-local state and reset when the screen remounts. |
| Select one to three reminders per day | `Prototype` | The selection is local UI state and does not schedule notifications. |
| TikTok connection state | `Prototype` | “Connected” is a static initial label; the disconnect control has no action. |
| Instagram connection | `Prototype` | The connect control has no action. |
| Log out | `Prototype` | The control has no action. |
| Delete account | `Prototype` | The control has no action or confirmation flow. |

## Ownership and state

`src/pages/settings` owns the entire screen and its local presentation state. There is currently no settings entity, feature slice, persistent store, form schema, API, authentication session, notification scheduler, or social-auth adapter connected to this page.

The page imports only shared theme and typography modules. This is intentional while the behavior remains screen-specific and unintegrated.

## Known limitations and implementation requirements

- Reminder choices do not survive navigation or application restart.
- `expo-notifications` is installed but not used by this screen.
- Social connections do not use authentication or external APIs.
- Account actions do not use an authenticated user model or backend.

When a control becomes functional, document its persistence owner, permission behavior, external service, loading and error states, and platform support here. If the same action gains another consumer, evaluate a feature extraction using the project workflow rather than moving all settings code preemptively.
