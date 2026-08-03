# Application shell and navigation

## User-visible behavior

Snaply opens into a four-tab application — 스튜디오 (`/`), 스냅 (`/snaps`), 무비 (`/movies`), and 나 (`/me`) — with a floating ember capture button centered over the tab bar between the second and third tabs. The tab bar shows icons only (no text labels); each screen keeps its label for accessibility and route-name fallback. Capture is an action rather than a tab: the center button opens `/capture` from any tab, which the root stack presents as a full-screen modal over the tab navigator. `/capture` is the viewfinder itself (the clip length is chosen inline, not on a separate setup screen).

| Capability | Status | Notes |
| --- | --- | --- |
| Root stack and route composition | `Functional` | Route files are thin Expo Router adapters. |
| Tab navigation | `Functional` | All platforms share one implementation using the stable `Tabs` navigator from `expo-router` (React Navigation bottom tabs) with four screens. The bar is icon-only (`tabBarShowLabel: false`) with `@expo/vector-icons` Ionicons; each screen keeps a `tabBarAccessibilityLabel`. |
| Center capture button | `Functional` | An ember circular button (`CaptureButton`) is rendered as an overlay inside `app-tabs.tsx`, outside `<Tabs>`, straddling the top edge of the tab bar and centered on the bar — which, with four equal tab items, falls in the gap between 스냅 and 무비 rather than over an icon. Its `pointerEvents="box-none"` container lets tab touches pass through; only the button is tappable, and it `router.push('/capture')`. It is an overlay rather than a tab because `/capture` is a root-stack modal, not a tab route. |
| Translucent blurred tab bar | `Functional` | The bar is absolutely positioned with a transparent background and an `expo-blur` `BlurView` (`tabBarBackground`) so scene content shows through it — native blur on iOS, `dimezisBlurViewSdk31Plus` on Android (semi-transparent fallback below SDK 31); tint is always `dark` (the app is dark-fixed). On Android the blur needs an explicit sample source: each tab scene is wrapped (via the navigator's `screenLayout`) in a `BlurTargetView` and the focused scene registers itself as the bar's `blurTarget` — without it the native side silently falls back to the tint-only background. A hairline top border remains. Scrollable screens offset content by `useTabBarHeight` (`shared/ui/theme`) so nothing sits permanently behind the bar. |
| Modal capture entry | `Functional` | The center button opens `/capture` as a root-stack full-screen modal (`presentation: 'fullScreenModal'`, header hidden); a close button on the screen returns to the Studio. |
| Native animated splash transition | `Functional` | The system splash is hidden after the overlay lays out, then the overlay — the Snaply moment-ring mark (`assets/images/brand-glyph-ember.png`, 150dp) on the ground background — fades out. The overlay's resting frame mirrors the native `expo-splash-screen` config exactly, so the handoff is seamless. |
| Web splash transition | `Functional` | The overlay intentionally renders nothing on web. |
| Dark-fixed theme | `Functional` | The app is a single dark world: video reads better against near-black than against a bright surface. `useTheme`/`useResolvedColorScheme` always resolve to the one palette regardless of OS appearance; there is no light theme, no in-app theme toggle, and no stored theme preference. |
| Unified Android system navigation bar | `Functional` | The OS contrast scrim behind the Android 3-button navigation bar is disabled (`expo-navigation-bar` config plugin, `enforceContrast: false`), so the system buttons float directly over the tab bar's blur instead of sitting on a separate opaque strip. `AppProviders` renders `NavigationBar` with a fixed dark style so the buttons stay light over the dark shell. Gesture navigation and iOS are unaffected. |
| Fixed status bar and navigation theme | `Functional` | `AppProviders` uses the Expo Router `DarkTheme` recolored with the app palette and a fixed light `expo-status-bar` style. |
| Film-grain overlay | Removed | A faint grain texture used to be laid over the whole app. It was the film metaphor's defining texture, which the redesign drops; `shared/ui/film-grain` was deleted with it. |
| Daily-roll gate | Removed | A headless provider used to create "today's roll" on app entry. There is no daily roll any more, so the provider and its entity are gone. |
| Screen-owned bottom chrome takeover | Removed | Removed earlier, when the cut selection mode moved onto its own pushed route. The Snap tab's selection bar now simply draws over the tab bar within its own screen. |

## Route map

| Route | Presentation | Owner |
| --- | --- | --- |
| `/` | 스튜디오 tab | `pages/studio` |
| `/snaps` | 스냅 tab; accepts `?select=1` to open in selection mode and `?for=<movieId>` to pick into a movie | `pages/snaps` |
| `/movies` | 무비 tab | `pages/movies` |
| `/me` | 나 tab | `pages/me` |
| `/capture` | Headerless root-stack full-screen modal (opened by the center capture button); the viewfinder | `pages/capture-record` |
| `/movie/[id]` | Root-stack screen with a themed native header ("무비 편집"); the three-step editor | `pages/movie-editor` |

`src/app` parses string search parameters where needed and passes them to page components as explicit props (`snaps.tsx` turns `?select=1` and `?for=<movieId>` into `startSelecting` and `forMovieId`). The `src/_app/routes` module owns stack and tab policies; page slices own screen content.

The editor is a pushed stack screen rather than a tab: it is a task with a beginning and an end, and it needs its own back affordance. Movie playback does not exist yet; it lands with the generation step (`docs/guides/ai-vlog-studio/refactor-plan.md`).

## Composition and ownership

- `src/app/_layout.tsx` exposes `RootLayout` from the `_app` Public API.
- `src/_app/providers/app-providers.tsx` fixes the Expo Router navigation theme, status-bar style, and Android navigation-bar button style to the app palette. It also mounts two headless nodes for the whole authenticated session — `PushTokenRegistrar` and `GeofenceGate` — which own no UI; see [Location alerts and push notifications](location-and-push-notifications.md). It wraps its children in `GestureHandlerRootView`, the ancestor `react-native-gesture-handler` gestures require, which expo-router's native stack does not provide.
- `src/_app/routes/root-layout.tsx` composes providers, splash behavior, and stack presentations, and imports `register-background-tasks` for its side effect so the background geofence task is defined at startup (including on a headless OS relaunch).
- `src/_app/routes/app-tabs.tsx` is the single cross-platform tab navigator (`Tabs` from `expo-router`) with the four screens plus the `CaptureButton` overlay; there is no platform-specific tab variant.
- `src/shared/ui/theme` owns the palette (including the `amber`, `lumen`, `ai`, and `media` tokens), spacing, radii, content width, dark-fixed theme access, the Android top content inset helper, the tab bar height helper (`useTabBarHeight`) used to offset scrollable screens beneath the translucent bar, and the `useReducedMotion` accessibility helper that lets animated screens present their final state immediately.
- `src/shared/ui/fade-in-view` owns the mount fade-in used instead of Reanimated `entering` presets, which never start on iOS in Expo Go and left content invisible.

## Known limitations

- The tab bar is a JS-drawn React Navigation bar, not a platform-native tab bar; it has no haptics or scroll-to-minimize. Its background blur is native on iOS and uses the `expo-blur` Dimezis implementation on Android (semi-transparent fallback below SDK 31).
- The Android blur samples only the focused tab scene's subtree (the `BlurTargetView` wrapper), because Dimezis BlurView v3 forbids the `BlurView` from living inside its own target — wrapping the whole navigator (which contains the tab bar) is not possible. Content rendered outside the scene, such as a root-stack modal sliding over the tabs, is not reflected in the bar's blur on Android.
- The splash animation is native-only.
- The theme is dark-fixed; the OS appearance setting has no effect.
- Expo Router's generated route types (`.expo/types/router.d.ts`) are a gitignored build artifact. They were stale after the route set changed, so the file was removed; it regenerates on the next `expo start`, and typed-route checking is unavailable until then.
