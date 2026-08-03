# Snaply feature documentation

## Purpose

This directory is the product-level source of truth for behavior that is currently represented in the Snaply application. It complements the architecture guides: architecture documents define how code should be organized, while these documents record what users can currently do, which code owns that behavior, and which experiences are still prototypes.

The inventory reflects the codebase as of 2026-08-03, after stage 1 of the studio rebuild (`docs/guides/ai-vlog-studio/refactor-plan.md`).

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
    ├── (tabs)         Four tabs + a center capture button
    │   ├── /          Studio (스튜디오): the 담기 tray, work-in-progress movies, recent finished ones
    │   ├── /snaps     Snap library (스냅): day-grouped grid, playback, selection → tray, deletion
    │   ├── /movies    Movie list (무비)
    │   └── /me        Profile, stats, and every preference (나)
    └── /capture       Camera recording with an inline 3초/5초 toggle
                       (full-screen modal, opened by the center capture button)
```

The tab bar hosts four tabs with a floating ember capture button centered over the bar. The button is not a tab; it opens the `/capture` modal from any tab.

There is no separate capture-setup screen: `/capture` opens straight into the viewfinder and the clip length is tuned inline while it is idle.

Access control: `src/_app/routes/root-layout.tsx` composes the four groups above with `Stack.Protected`. The two `auth/*` deep-link landings sit outside every guard so an email link always resolves; the recovery group takes precedence over the authenticated one, so a recovery link cannot reach the app until the new password is set. See [Authentication](authentication.md) for the deep-link flow.

Headless behavior: while authenticated, `src/_app/providers` mounts `PushTokenRegistrar` and `GeofenceGate`, and `src/_app/routes/register-background-tasks.ts` defines the background geofence task at startup. These have no route (see [Location alerts and push notifications](location-and-push-notifications.md)).

The main user journey is:

```text
Tap the center capture button in the tab bar
  → land in the viewfinder; choose a 3- or 5-second length inline
  → press and hold to record a short snap on iOS or Android
  → the snap is saved to the library and the recorder stays on the viewfinder,
    ready for the next hold — ✕ leaves to the Studio
  → open the Snap tab → 선택 → pick snaps → 트레이에 담기
  → the Studio's tray holds them until a movie is started from it
```

The last step of that journey — turning the tray into a movie — is **not implemented yet**. Stage 1 of the rebuild replaced the domain (roll/clip/reel → movie/snap/tray) and the information architecture; the editor, generation, and playback land in stages 2 and 3 (`docs/guides/ai-vlog-studio/refactor-plan.md`).

## Feature index

| Feature document | Current scope | Status |
| --- | --- | --- |
| [Application shell and navigation](app-shell-and-navigation.md) | Providers, splash, root stack, four-tab navigation, capture button, route adapters, theme | `Functional` |
| [Authentication](authentication.md) | Supabase email/password sign-in, sign-up with email confirmation, password reset (both via deep link), Google OAuth (Apple deferred), Supabase-owned session persistence, route guard, sign-out | `Functional` |
| [Studio and movies](studio.md) | The 담기 tray (pick order, ten-snap cap, persistence), the work-in-progress and finished lanes, the movie tab, and the movie data model | `Partial` |
| [Snap library](snaps.md) | Day-grouped snap grid, playback, selection → tray, cascading deletion, the file and thumbnail model | `Functional` |
| [Capture flow](capture-flow.md) | Inline duration option, permissions, press-and-hold recording, saving a snap, in-camera feedback, recording library | `Functional` |
| [Me tab](me.md) | Profile, snap/movie/tray stats, reminder, notification, social-connection, and account controls | `Partial` |
| [Location alerts and push notifications](location-and-push-notifications.md) | FCM token registration, geofence monitoring, arrival reporting, foreground notification presentation | `Partial` |

## Current FSD ownership map

| Layer | Current modules | Responsibility |
| --- | --- | --- |
| `src/app` | Route files and layouts | Parse route parameters and expose `_app` layouts or page Public APIs to Expo Router. |
| `src/_app` | `providers`, `routes`, `styles` | Compose the navigation theme, splash overlay, root stack with the session route guard, and the four-tab navigation. Also mount the headless `PushTokenRegistrar` and `GeofenceGate`, and define the background geofence task at startup (`register-background-tasks`). |
| `src/pages` | `sign-in`, `sign-up`, `reset-password`, `update-password`, `auth-callback`, `studio`, `snaps`, `movies`, `me`, `capture-record` | Own screen composition and screen-specific state. A screen that draws a movie's cuts composes the movie↔snap join through `entities/snap`'s `useSnapsByRefs` rather than resolving references itself. |
| `src/widgets` | `movie-shelf` | Owns the cross-entity movie read model — a movie summarized for a card (cut count, total seconds, cover frames, date label) plus the in-progress and finished lane selectors. |
| `src/features` | `capture-moment`, `delete-snap`, `manage-recordings`, `sign-in`, `sign-up`, `reset-password`, `notification-settings`, `geofence-monitor`, `register-push-token` | Own saving a captured snap, cascading original deletion (file, thumbnail, movie references, tray entry, metadata), reused local-recording handling, the email/social sign-in, sign-up, and password-reset actions, the notification preferences, OS geofence monitoring, and FCM token registration. |
| `src/entities` | `capture-session`, `snap`, `movie`, `tray`, `session`, `location` | Define the capture duration, own the snap library and the rule for resolving a movie's snap references against it (`snapsByRefs` / `useSnapsByRefs` / `useSnapIndex`, structurally typed so neither snap nor movie imports the other), own movies (cut lists, style, lifecycle), own the 담기 tray (pick order and the ten-snap cap), the authenticated session and current user, and geofence points. |
| `src/shared` | `api`, `config`, `lib/recording-files`, `lib/local-store`, `lib/secure-storage`, `lib/supabase`, `lib/location`, `lib/notifications`, `lib/video-thumbnails`, `lib/validation`, `lib/format-file-size`, `lib/datetime`, UI modules | Provide the HTTP client and mock-mode switch, the platform-specific file, JSON local-store, secure-storage, Supabase, location, notification, and video-thumbnail adapters, validation primitives, the date/time and duration formatters every screen prints (`lib/datetime`), design tokens, theme helpers, typography, buttons, the video frame and player chrome, and other business-agnostic UI. |

The `widgets` layer holds the cross-entity read models that no single entity may own and more than one screen needs (`movie-shelf`). A cross-entity read with a single consumer stays in its page — the Snap tab's movie-delete impact is an example — and is promoted only when a second surface needs it. Neither layer holds formatters: a business-agnostic date, time, or duration format belongs in `shared/lib/datetime`, so a page never depends on a feature or a widget in order to print one.

## Documentation maintenance contract

Feature documentation must change in the same work item as the behavior it describes.

For every user-visible addition, change, removal, or prototype-to-functional transition:

1. Read this index and every affected feature document before editing code.
2. Update the relevant document's behavior, route flow, ownership, platform support, persistence, status, and limitations.
3. Add a new document when the behavior does not belong to an existing feature, then add it to the feature index and application map.
4. Update cross-feature flows in every affected document. For example, changing how a captured snap enters the library affects both `capture-flow.md` and `snaps.md`.
5. Describe only behavior evidenced by the implementation. Clearly label static fixtures, simulated progress, placeholder controls, and unsupported platforms.
6. Include documentation review in the completion checklist even when no text change is ultimately necessary; record why the existing document remains accurate in the task or review notes.

Architectural rules remain owned by `docs/architecture`, `docs/conventions`, and `docs/frameworks`. If a feature change also changes an architectural standard, update both the feature document and the relevant architecture guide.
