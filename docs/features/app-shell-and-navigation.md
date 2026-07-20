# Application shell and navigation

## User-visible behavior

Snaply opens into a two-tab application with Home and Archive destinations. Capture is an action rather than a tab: a floating button on the Home screen opens `/capture`, which the root stack presents modally over the tab navigator. Settings and the four capture screens (`/capture` plus the three post-setup screens) are all presented by the root stack outside the tab navigator.

| Capability | Status | Notes |
| --- | --- | --- |
| Root stack and route composition | `Functional` | Route files are thin Expo Router adapters. |
| Native tab navigation | `Functional` | iOS and Android use `expo-router/unstable-native-tabs` with two triggers (Home, Archive). |
| Web tab navigation | `Functional` | Web uses a custom floating tab bar built with `expo-router/ui` with two triggers (Home, Archive). |
| Modal Capture entry | `Functional` | The Home floating button opens `/capture` as a root-stack modal (`presentation: 'modal'`, header hidden); a close button on the screen returns to Home. |
| Native animated splash transition | `Functional` | The system splash is hidden after the overlay lays out, then the overlay — the Snaply brand mark (`assets/images/brand-glyph-orange.png`) on the primary background — fades out. |
| Web splash transition | `Functional` | The overlay intentionally renders nothing on web. |
| Light and dark application theme | `Functional` | The resolved scheme follows the user's theme mode (`system`, `light`, `dark`) from Settings; `system` follows the OS appearance (`userInterfaceStyle: "automatic"`). |
| Theme-aware status bar and navigation theme | `Functional` | `AppProviders` derives the Expo Router navigation theme and `expo-status-bar` style from the resolved scheme. |

## Route map

| Route | Presentation | Owner |
| --- | --- | --- |
| `/` | Home tab | `pages/home` |
| `/archive` | Archive tab | `pages/archive` |
| `/capture` | Root-stack modal (opened from the Home floating button) | `pages/capture-setup` |
| `/settings` | Root-stack modal | `pages/settings` |
| `/capture/record` | Headerless root-stack screen | `pages/capture-record` |
| `/capture/editing` | Headerless root-stack screen | `pages/capture-editing` |
| `/capture/result` | Headerless root-stack screen | `pages/capture-result` |

`src/app` parses string search parameters where needed and passes them to page components as explicit props. The `src/_app/routes` module owns stack and tab policies; page slices own screen content.

## Composition and ownership

- `src/app/_layout.tsx` exposes `RootLayout` from the `_app` Public API.
- `src/_app/providers/app-providers.tsx` derives the Expo Router navigation theme and status-bar style from the resolved color scheme.
- `src/_app/routes/root-layout.tsx` composes providers, splash behavior, and stack presentations.
- `src/_app/routes/app-tabs.tsx` and `app-tabs.web.tsx` preserve the same export while implementing platform-specific navigation, each with the Home and Archive triggers only.
- `src/shared/ui/theme` owns colors, spacing, radii, content width, bottom-tab inset, theme access, the persisted theme-mode store, and the Android top content inset helper.
- `src/shared/ui/fade-in-view` owns the mount fade-in used instead of Reanimated `entering` presets, which never start on iOS in Expo Go and left content invisible.

## Known limitations

- The native tab implementation uses an unstable Expo Router API and should be verified when Expo Router changes.
- The splash animation is native-only.
- The theme mode persists through the SecureStore-backed adapter in `shared/lib/secure-storage` (localStorage on web); the first frame before rehydration uses the system scheme.
