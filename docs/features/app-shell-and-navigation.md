# Application shell and navigation

## User-visible behavior

Snaply opens into a three-tab application with Home, Archive, and Settings destinations. The tab bar shows icons only (no text labels); the Home, Archive, and Settings labels are retained for accessibility and route-name fallback but hidden. Capture is an action rather than a tab: the Home contextual card's capture button opens `/capture`, which the root stack presents modally over the tab navigator. The four capture screens (`/capture` plus the three post-setup screens) are presented by the root stack outside the tab navigator.

| Capability | Status | Notes |
| --- | --- | --- |
| Root stack and route composition | `Functional` | Route files are thin Expo Router adapters. |
| Tab navigation | `Functional` | All platforms share one implementation using the stable `Tabs` navigator from `expo-router` (React Navigation bottom tabs) with three screens (Home, Archive, Settings). The bar is icon-only (`tabBarShowLabel: false`) with `@expo/vector-icons` Ionicons; each screen keeps a `tabBarAccessibilityLabel`. |
| Translucent blurred tab bar | `Functional` | The bar is absolutely positioned with a transparent background and an `expo-blur` `BlurView` (`tabBarBackground`) so scene content shows through it — native blur on iOS, `dimezisBlurViewSdk31Plus` on Android (semi-transparent fallback below SDK 31); tint is always `dark` (the app is dark-fixed). On Android the blur needs an explicit sample source: each tab scene is wrapped (via the navigator's `screenLayout`) in a `BlurTargetView` and the focused scene registers itself as the bar's `blurTarget` — without it the native side silently falls back to the tint-only background. A hairline top border remains. Scrollable screens offset content by `useTabBarHeight` (`shared/ui/theme`) so nothing sits permanently behind the bar. |
| Film-grain overlay | `Functional` | A faint, non-interactive film-grain texture (`shared/ui/film-grain`, an `expo-image`-rendered SVG noise at ~5% opacity) is laid over the whole app from `RootLayout`. It is the darkroom's defining texture and never intercepts touches. |
| Modal Capture entry | `Functional` | The Home contextual card's capture button opens `/capture` as a root-stack modal (`presentation: 'modal'`, header hidden); a close button on the screen returns to Home. |
| Native animated splash transition | `Functional` | The system splash is hidden after the overlay lays out, then the overlay — the Snaply brand mark (`assets/images/brand-glyph-orange.png`) on the primary background — fades out. |
| Web splash transition | `Functional` | The overlay intentionally renders nothing on web. |
| Dark-fixed darkroom theme | `Functional` | The app is a single dark world — the "darkroom" (moment-collection redesign, concept §5). `useTheme`/`useResolvedColorScheme` always resolve to the dark darkroom palette regardless of OS appearance or any stored theme-mode; there is no light theme and no in-app theme toggle. |
| Unified Android system navigation bar | `Functional` | The OS contrast scrim behind the Android 3-button navigation bar is disabled (`expo-navigation-bar` config plugin, `enforceContrast: false`), so the system buttons float directly over the tab bar's blur instead of sitting on a separate opaque strip. `AppProviders` renders `NavigationBar` with a fixed dark style so the buttons stay light over the dark shell. Gesture navigation and iOS are unaffected. |
| Fixed status bar and navigation theme | `Functional` | `AppProviders` uses the Expo Router `DarkTheme` recolored with the darkroom palette and a fixed light `expo-status-bar` style. |

## Route map

| Route | Presentation | Owner |
| --- | --- | --- |
| `/` | Home tab | `pages/home` |
| `/archive` | Archive tab | `pages/archive` |
| `/settings` | Settings tab | `pages/settings` |
| `/capture` | Root-stack modal (opened from the Home contextual card) | `pages/capture-setup` |
| `/capture/record` | Headerless root-stack screen | `pages/capture-record` |
| `/capture/editing` | Headerless root-stack screen | `pages/capture-editing` |
| `/capture/result` | Headerless root-stack screen | `pages/capture-result` |

`src/app` parses string search parameters where needed and passes them to page components as explicit props. The `src/_app/routes` module owns stack and tab policies; page slices own screen content.

## Composition and ownership

- `src/app/_layout.tsx` exposes `RootLayout` from the `_app` Public API.
- `src/_app/providers/app-providers.tsx` fixes the Expo Router navigation theme, status-bar style, and Android navigation-bar button style to the dark darkroom palette. It also mounts two headless nodes for the whole authenticated session — `PushTokenRegistrar` and `GeofenceGate` — which own no UI; see [Location alerts and push notifications](location-and-push-notifications.md).
- `src/_app/routes/root-layout.tsx` composes providers, splash behavior, and stack presentations, mounts the app-wide `FilmGrain` overlay (`shared/ui/film-grain`), and imports `register-background-tasks` for its side effect so the background geofence task is defined at startup (including on a headless OS relaunch).
- `src/_app/routes/app-tabs.tsx` is the single cross-platform tab navigator (`Tabs` from `expo-router`) with the Home, Archive, and Settings screens; there is no platform-specific tab variant.
- `src/shared/ui/theme` owns the darkroom palette (including the `amber`, `lumen`, and `film` tokens), spacing, radii, content width, dark-fixed theme access, the (now unconsumed) persisted theme-mode store, the Android top content inset helper, and the tab bar height helper (`useTabBarHeight`) used to offset scrollable screens beneath the translucent bar.
- `src/shared/ui/fade-in-view` owns the mount fade-in used instead of Reanimated `entering` presets, which never start on iOS in Expo Go and left content invisible.

## Known limitations

- The tab bar is a JS-drawn React Navigation bar, not a platform-native tab bar; it has no haptics or scroll-to-minimize. Its background blur is native on iOS and uses the `expo-blur` Dimezis implementation on Android (semi-transparent fallback below SDK 31).
- The Android blur samples only the focused tab scene's subtree (the `BlurTargetView` wrapper), because Dimezis BlurView v3 forbids the `BlurView` from living inside its own target — wrapping the whole navigator (which contains the tab bar) is not possible. Content rendered outside the scene, such as a root-stack modal sliding over the tabs, is not reflected in the bar's blur on Android.
- The splash animation is native-only.
- The theme is dark-fixed; the OS appearance setting has no effect, and the persisted theme-mode store is retained but no longer applied.
- The film-grain overlay renders reliably on web (SVG `feTurbulence`); on native it depends on `expo-image`'s SVG decoding and degrades to invisible if the filter is unsupported, which is acceptable for a decorative texture.
