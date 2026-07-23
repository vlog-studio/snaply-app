# Snaply feature documentation

## Purpose

This directory is the product-level source of truth for behavior that is currently represented in the Snaply application. It complements the architecture guides: architecture documents define how code should be organized, while these documents record what users can currently do, which code owns that behavior, and which experiences are still prototypes.

The inventory reflects the codebase as of 2026-07-23.

## Implementation status vocabulary

Use these labels consistently in every feature document.

| Status | Meaning |
| --- | --- |
| `Functional` | The user flow performs its described local or remote effect and handles its primary success and failure paths. |
| `Partial` | A meaningful part of the flow works, but a documented integration or platform path is missing. |
| `Prototype` | The UI demonstrates the intended experience with static, temporary, or simulated data and does not perform the implied product effect. |

Never describe a prototype as functional merely because its controls can be pressed or its animation completes.

## Current application map

```text
Root stack
├── /sign-in           Social sign-in (shown when signed out)
├── (tabs)             (guarded: requires a session — two tabs + a center safelight button)
│   ├── /              Home (오늘)
│   └── /archive       Clip archive + developed-roll shelf (보관함); settings entry in its corner
├── /settings          Settings (guarded; opened from the archive corner, no longer a tab)
├── /roll/[id]         Roll detail contact sheet; develop / view-reel entry (guarded)
└── /capture           Capture setup (modal, guarded; opened by the center safelight button)
    ├── /record        Camera recording; 담기 into today's roll
    ├── /editing       Develop ceremony (composes + persists the roll's reel)
    └── /result        Sequential reel player
```

The tab bar hosts two tabs (오늘 / 보관함) with a floating amber safelight button centered over the bar. The safelight is not a tab; it opens the `/capture` modal from either tab. Settings is reached from a corner control on the archive screen.

Access control: `src/_app/routes/root-layout.tsx` guards the tab and capture routes with `Stack.Protected` based on session state. A signed-out user is routed to `/sign-in`.

Headless behavior: while authenticated, `src/_app/providers` mounts `PushTokenRegistrar`, `GeofenceGate`, and `DailyRollGate` (ensures today's roll exists on entry), and `src/_app/routes/register-background-tasks.ts` defines the background geofence task at startup. These have no route (see [Location alerts and push notifications](location-and-push-notifications.md)).

The main user journey is:

```text
Tap the center safelight button in the tab bar
  → choose mood and 3- or 5-second duration
  → record a short clip on iOS or Android
  → the clip is collected into today's roll (undeveloped) and returns Home
  → open the roll (contact sheet) → 현상하기 → develop ceremony composes the reel
  → the reel plays its clips back-to-back (sequential reel player)
```

## Feature index

| Feature document | Current scope | Status |
| --- | --- | --- |
| [Application shell and navigation](app-shell-and-navigation.md) | Providers, splash, root stack, native/web tabs, route adapters, theme | `Functional` |
| [Authentication](authentication.md) | Supabase Google/Apple OAuth sign-in, Supabase-owned session persistence, route guard, sign-out | `Functional` |
| [Home and moment overview](home.md) | Today's-roll edge print, real clip counter and contact-sheet preview, delayed-develop notice, real developed-roll shelf preview, roll-detail entry | `Partial` |
| [Capture flow](capture-flow.md) | Mood/duration setup, permissions, camera recording, 담기 into today's roll, develop ceremony, sequential reel playback | `Partial` |
| [Roll detail](roll-detail.md) | Roll contact-sheet grid of undeveloped clips, clip counter, develop / view-reel CTA | `Functional` |
| [Recording archive](recording-archive.md) | Local clip persistence, listing, playback, deletion; developed-roll shelf backed by the roll store | `Partial` |
| [Settings](settings.md) | Reminder, frequency, social connection, and account controls | `Prototype` |
| [Location alerts and push notifications](location-and-push-notifications.md) | FCM token registration, geofence monitoring, arrival reporting, foreground notification presentation | `Partial` |

## Current FSD ownership map

| Layer | Current modules | Responsibility |
| --- | --- | --- |
| `src/app` | Route files and layouts | Parse route parameters and expose `_app` layouts or page Public APIs to Expo Router. |
| `src/_app` | `providers`, `routes`, `styles` | Compose the darkroom navigation theme, splash overlay, root stack with the session route guard, and the cross-platform tab navigation. Also mount the headless `PushTokenRegistrar`, `GeofenceGate`, and `DailyRollGate`, and define the background geofence task at startup (`register-background-tasks`). |
| `src/pages` | `sign-in`, `home`, `capture-record`, `capture-editing`, `capture-result`, `roll-detail`, `archive`, `settings` | Own screen composition and screen-specific state (including the roll↔clip join in `roll-detail`). |
| `src/widgets` | `developed-rolls-shelf` | Own the cross-entity developed-rolls read model (rolls + clip durations) shared by the home shelf preview and the archive shelf grid. |
| `src/features` | `capture-moment`, `develop-roll`, `manage-recordings`, `sign-in`, `notification-settings`, `geofence-monitor`, `register-push-token` | Own the 담기 action (persist clip + add to today's roll), the 현상 action (rules-based reel composition + status), reuse local-recording handling, the social sign-in action, the notification preferences, OS geofence monitoring, and FCM token registration. |
| `src/entities` | `capture-session`, `clip`, `roll`, `session`, `location` | Define capture moods/durations, own the clip archive and rolls (today's-roll selection, membership, develop status), the authenticated session and current user, and geofence points. |
| `src/shared` | `lib/recording-files`, `lib/local-store`, `lib/secure-storage`, `lib/location`, `lib/notifications`, UI modules | Provide the platform-specific file, JSON local-store, secure-storage, location, and notification adapters, design tokens, theme helpers, typography, buttons, and other business-agnostic UI. |

No `widgets` layer is currently needed. Page-specific blocks remain inside their owning page slices.

## Documentation maintenance contract

Feature documentation must change in the same work item as the behavior it describes.

For every user-visible addition, change, removal, or prototype-to-functional transition:

1. Read this index and every affected feature document before editing code.
2. Update the relevant document's behavior, route flow, ownership, platform support, persistence, status, and limitations.
3. Add a new document when the behavior does not belong to an existing feature, then add it to the feature index and application map.
4. Update cross-feature flows in every affected document. For example, changing how capture results enter the archive affects both `capture-flow.md` and `recording-archive.md`.
5. Describe only behavior evidenced by the implementation. Clearly label static fixtures, simulated progress, placeholder controls, and unsupported platforms.
6. Include documentation review in the completion checklist even when no text change is ultimately necessary; record why the existing document remains accurate in the task or review notes.

Architectural rules remain owned by `docs/architecture`, `docs/conventions`, and `docs/frameworks`. If a feature change also changes an architectural standard, update both the feature document and the relevant architecture guide.
