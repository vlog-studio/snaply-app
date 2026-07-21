# Snaply feature documentation

## Purpose

This directory is the product-level source of truth for behavior that is currently represented in the Snaply application. It complements the architecture guides: architecture documents define how code should be organized, while these documents record what users can currently do, which code owns that behavior, and which experiences are still prototypes.

The inventory reflects the codebase as of 2026-07-21.

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
├── (tabs)             (guarded: requires a session)
│   ├── /              Home (with floating capture button)
│   └── /archive       Recording archive and vlog prototype
├── /settings          Settings modal
└── /capture           Capture setup (modal, guarded)
    ├── /record        Camera recording and review
    ├── /editing       Simulated AI-editing progress
    └── /result        Simulated edited-result summary
```

Access control: `src/_app/routes/root-layout.tsx` guards the tab and capture routes with `Stack.Protected` based on session state. A signed-out user is routed to `/sign-in`.

The main user journey is:

```text
Home floating capture button (or contextual card)
  → choose mood and 3- or 5-second duration
  → record and persist a local video on iOS or Android
  → review the selected original recording
  → simulated AI editing
  → simulated result
  → Archive or another capture
```

## Feature index

| Feature document | Current scope | Status |
| --- | --- | --- |
| [Application shell and navigation](app-shell-and-navigation.md) | Providers, splash, root stack, native/web tabs, route adapters, theme | `Functional` |
| [Authentication](authentication.md) | Social sign-in (mock), session persistence, route guard, sign-out | `Partial` |
| [Home and moment overview](home.md) | Daily prompt, contextual capture entry, moment progress, daily-vlog entry | `Prototype` |
| [Capture flow](capture-flow.md) | Mood/duration setup, permissions, camera recording, review, simulated editing and result | `Partial` |
| [Recording archive](recording-archive.md) | Local recording persistence, listing, playback, selection, and deletion; vlog archive preview | `Partial` |
| [Settings](settings.md) | Reminder, frequency, social connection, and account controls | `Prototype` |

## Current FSD ownership map

| Layer | Current modules | Responsibility |
| --- | --- | --- |
| `src/app` | Route files and layouts | Parse route parameters and expose `_app` layouts or page Public APIs to Expo Router. |
| `src/_app` | `providers`, `routes`, `styles` | Compose the scheme-resolved (light/dark) navigation theme, splash overlay, root stack with the session route guard, and platform-specific tab navigation. |
| `src/pages` | `sign-in`, `home`, `capture-setup`, `capture-record`, `capture-editing`, `capture-result`, `archive`, `settings` | Own screen composition and screen-specific state. |
| `src/features` | `manage-recordings`, `sign-in` | Reuse local-recording handling across capture and archive screens, and the social sign-in action. |
| `src/entities` | `capture-session`, `session` | Define supported capture moods and durations, and own the authenticated session and current user. |
| `src/shared` | `lib/recording-files`, `lib/secure-storage`, UI modules | Provide the platform-specific file and secure-storage adapters, design tokens, theme helpers, typography, buttons, and other business-agnostic UI. |

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
