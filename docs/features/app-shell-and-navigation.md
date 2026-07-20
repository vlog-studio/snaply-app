# Application shell and navigation

## User-visible behavior

Snaply opens into a three-tab application with Home, Capture, and Archive destinations. Settings and the three post-setup capture screens are presented by the root stack outside the tab navigator. The Capture tab presents full-screen: the tab bar hides while `/capture` is focused and a close button on the screen returns to Home.

| Capability | Status | Notes |
| --- | --- | --- |
| Root stack and route composition | `Functional` | Route files are thin Expo Router adapters. |
| Native tab navigation | `Functional` | iOS and Android use `expo-router/unstable-native-tabs`. |
| Web tab navigation | `Functional` | Web uses a custom floating tab bar built with `expo-router/ui`. |
| Full-screen Capture tab | `Functional` | `pages/capture-setup` hides the tab bar on focus via the `shared/ui/tab-bar-visibility` store (`hidden` on `NativeTabs`; `display: none` on the web tab list) and restores it on blur. |
| Native animated splash transition | `Functional` | The system splash is hidden after the overlay lays out, then the overlay — the Snaply brand mark (`assets/images/brand-glyph-orange.png`) on the primary background — fades out. |
| Web splash transition | `Functional` | The overlay intentionally renders nothing on web. |
| Light and dark application theme | `Functional` | The resolved scheme follows the user's theme mode (`system`, `light`, `dark`) from Settings; `system` follows the OS appearance (`userInterfaceStyle: "automatic"`). |
| Theme-aware status bar and navigation theme | `Functional` | `AppProviders` derives the Expo Router navigation theme and `expo-status-bar` style from the resolved scheme. |

## Route map

| Route | Presentation | Owner |
| --- | --- | --- |
| `/` | Home tab | `pages/home` |
| `/capture` | Capture tab (tab bar hidden while focused) | `pages/capture-setup` |
| `/archive` | Archive tab | `pages/archive` |
| `/settings` | Root-stack modal | `pages/settings` |
| `/capture/record` | Headerless root-stack screen | `pages/capture-record` |
| `/capture/editing` | Headerless root-stack screen | `pages/capture-editing` |
| `/capture/result` | Headerless root-stack screen | `pages/capture-result` |

`src/app` parses string search parameters where needed and passes them to page components as explicit props. The `src/_app/routes` module owns stack and tab policies; page slices own screen content.

## Composition and ownership

- `src/app/_layout.tsx` exposes `RootLayout` from the `_app` Public API.
- `src/_app/providers/app-providers.tsx` derives the Expo Router navigation theme and status-bar style from the resolved color scheme.
- `src/_app/routes/root-layout.tsx` composes providers, splash behavior, and stack presentations.
- `src/_app/routes/app-tabs.tsx` and `app-tabs.web.tsx` preserve the same export while implementing platform-specific navigation.
- `src/shared/ui/theme` owns colors, spacing, radii, content width, bottom-tab inset, theme access, the persisted theme-mode store, and the Android top content inset helper.
- `src/shared/ui/tab-bar-visibility` owns the in-memory tab-bar-hidden store. Screens that need a full-screen presentation set it while focused; both tab-bar implementations subscribe to it.
- `src/shared/ui/fade-in-view` owns the mount fade-in used instead of Reanimated `entering` presets, which never start on iOS in Expo Go and left content invisible.

## Known limitations

- The native tab implementation uses an unstable Expo Router API and should be verified when Expo Router changes.
- The splash animation is native-only.
- The theme mode persists through the SecureStore-backed adapter in `shared/lib/secure-storage` (localStorage on web); the first frame before rehydration uses the system scheme.
