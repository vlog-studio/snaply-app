# Snaply feature documentation

## Purpose

This directory is the product-level source of truth for behavior that is currently represented in the Snaply application. It complements the architecture guides: architecture documents define how code should be organized, while these documents record what users can currently do, which code owns that behavior, and which experiences are still prototypes.

The inventory reflects the codebase as of 2026-07-28.

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
├── /auth/callback     Sign-up confirmation + OAuth deep-link landing (unguarded)
├── /auth/reset        Password-recovery deep-link landing (unguarded)
│
├── (recovery guard: isRecovering)
│   └── /update-password   Set a new password; blocks the app until saved
│
├── (signed-out guard)
│   ├── /sign-in       Email/password + Google sign-in
│   ├── /sign-up       Create an account (email confirmation)
│   └── /reset-password    Request a recovery link
│
└── (authenticated guard)
    ├── (tabs)         Two tabs + a center safelight button
    │   ├── /          Home (오늘)
    │   └── /archive   Film cabinet (보관함): develop-waiting lane, developed shelf by month, cut drawer
    ├── /cuts          Every original cut, as a contact strip (opened from the cabinet's drawer)
    ├── /settings      Settings (opened from the archive corner, no longer a tab)
    ├── /roll/[id]     Roll detail contact sheet; develop / view-reel entry
    └── /capture       Camera recording with inline mood/duration options; 담기 into today's roll
                       (full-screen modal, opened by the center safelight button)
        ├── /editing   Develop ceremony (composes + persists the roll's reel)
        └── /result    Sequential reel player
```

The tab bar hosts two tabs (오늘 / 보관함) with a floating amber safelight button centered over the bar. The safelight is not a tab; it opens the `/capture` modal from either tab. Settings is reached from a corner control on the archive screen.

There is no separate capture-setup screen: `/capture` opens straight into the viewfinder and the mood and duration are tuned inline while it is idle. `/capture/editing` and `/capture/result` operate on a real roll (`?rollId=`) and are reached from Roll detail or the cabinet's waiting lane, not from the recorder.

Access control: `src/_app/routes/root-layout.tsx` composes the four groups above with `Stack.Protected`. The two `auth/*` deep-link landings sit outside every guard so an email link always resolves; the recovery group takes precedence over the authenticated one, so a recovery link cannot reach the app until the new password is set. See [Authentication](authentication.md) for the deep-link flow.

Headless behavior: while authenticated, `src/_app/providers` mounts `PushTokenRegistrar`, `GeofenceGate`, and `DailyRollGate` (ensures today's roll exists on entry), and `src/_app/routes/register-background-tasks.ts` defines the background geofence task at startup. These have no route (see [Location alerts and push notifications](location-and-push-notifications.md)).

The main user journey is:

```text
Tap the center safelight button in the tab bar
  → land in the viewfinder; tune mood and 3- or 5-second duration inline
  → press and hold to record a short clip on iOS or Android
  → the clip is collected into today's roll (undeveloped) and the recorder stays
    on the viewfinder, ready for the next hold — ✕ leaves to Home
  → open the roll (contact sheet) → 현상하기 → develop ceremony composes the reel
  → the reel plays its clips back-to-back (sequential reel player)
```

## Feature index

| Feature document | Current scope | Status |
| --- | --- | --- |
| [Application shell and navigation](app-shell-and-navigation.md) | Providers, splash, root stack, native/web tabs, route adapters, theme | `Functional` |
| [Authentication](authentication.md) | Supabase email/password sign-in, sign-up with email confirmation, password reset (both via deep link), Google OAuth (Apple deferred), Supabase-owned session persistence, route guard, sign-out | `Functional` |
| [Home and moment overview](home.md) | Today's-roll edge print, real clip counter and contact-sheet preview, delayed-develop notice, real developed-roll shelf preview, roll-detail entry | `Partial` |
| [Capture flow](capture-flow.md) | Inline mood/duration options, permissions, press-and-hold recording, continuous 담기 into today's roll, develop ceremony, sequential reel playback | `Partial` |
| [Roll detail](roll-detail.md) | Roll contact-sheet grid, single-cut playback, cut add/remove/reorder on undeveloped rolls, clip counter, develop / view-reel CTA | `Functional` |
| [Recording archive](recording-archive.md) | Film cabinet (develop-waiting lane, developed shelf by month with real cover art and empty-day counts, cut drawer) and the `/cuts` screen (listing, playback, cascading deletion) | `Partial` |
| [Settings](settings.md) | Reminder, frequency, social connection, and account controls | `Prototype` |
| [Location alerts and push notifications](location-and-push-notifications.md) | FCM token registration, geofence monitoring, arrival reporting, foreground notification presentation | `Partial` |

## Current FSD ownership map

| Layer | Current modules | Responsibility |
| --- | --- | --- |
| `src/app` | Route files and layouts | Parse route parameters and expose `_app` layouts or page Public APIs to Expo Router. |
| `src/_app` | `providers`, `routes`, `styles` | Compose the darkroom navigation theme, splash overlay, root stack with the session route guard, and the cross-platform tab navigation. Also mount the headless `PushTokenRegistrar`, `GeofenceGate`, and `DailyRollGate`, and define the background geofence task at startup (`register-background-tasks`). |
| `src/pages` | `sign-in`, `sign-up`, `reset-password`, `update-password`, `auth-callback`, `home`, `capture-record`, `capture-editing`, `capture-result`, `roll-detail`, `archive`, `cut-strip`, `settings` | Own screen composition and screen-specific state (including the roll↔clip joins in `roll-detail` and `cut-strip`). |
| `src/widgets` | `roll-shelf`, `clip-membership` | Own the cross-entity roll read models — the develop-waiting lane and the developed shelf grouped by month (`roll-shelf`), and the reverse `clip → rolls` index (`clip-membership`). |
| `src/features` | `capture-moment`, `collect-clips`, `develop-roll`, `delete-clip`, `manage-recordings`, `sign-in`, `sign-up`, `reset-password`, `notification-settings`, `geofence-monitor`, `register-push-token` | Own the 담기 action (persist clip + add to today's roll), roll membership (bundle into a new roll, add to an existing one, take back out — with the "a developed roll is frozen" rule), the 현상 action (rules-based reel composition + status), cascading original deletion, reused local-recording handling, the email/social sign-in, sign-up, and password-reset actions, the notification preferences, OS geofence monitoring, and FCM token registration. |
| `src/entities` | `capture-session`, `clip`, `roll`, `session`, `location` | Define capture moods/durations, own the clip archive and rolls (today's-roll selection, membership, develop status), the authenticated session and current user, and geofence points. |
| `src/shared` | `api`, `config`, `lib/recording-files`, `lib/local-store`, `lib/secure-storage`, `lib/supabase`, `lib/location`, `lib/notifications`, `lib/video-thumbnails`, `lib/validation`, `lib/format-file-size`, UI modules | Provide the HTTP client and mock-mode switch, the platform-specific file, JSON local-store, secure-storage, Supabase, location, notification, and video-thumbnail adapters, validation primitives, design tokens, theme helpers, typography, buttons, and other business-agnostic UI. |

The `widgets` layer holds the cross-entity read models that no single entity may own and more than one screen needs (`roll-shelf`, `clip-membership`). Page-specific blocks stay inside their owning page slices.

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
