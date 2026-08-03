# Application shell and navigation

## User-visible behavior

Snaply opens into a four-tab application — 스튜디오 (`/`), 스냅 (`/snaps`), 무비 (`/movies`), and 나 (`/me`) — laid out as **five slots**: the four tabs sit two to either side of a reserved middle lane that holds an ember capture button. The tab bar shows icons only (no text labels); each screen keeps its label for accessibility and route-name fallback. Capture is an action rather than a tab: the center button opens `/capture` from any tab, which the root stack presents as a full-screen modal over the tab navigator. `/capture` is the viewfinder itself (the clip length is chosen inline, not on a separate setup screen).

| Capability | Status | Notes |
| --- | --- | --- |
| Root stack and route composition | `Functional` | Route files are thin Expo Router adapters. |
| Tab navigation | `Functional` | All platforms share one implementation using the stable `Tabs` navigator from `expo-router` (React Navigation bottom tabs) with four screens. The bar is icon-only (`tabBarShowLabel: false`) with `@expo/vector-icons` Ionicons; each screen keeps a `tabBarAccessibilityLabel`. |
| Center capture button | `Functional` | A 52pt ember circular button (`CaptureButton`) is rendered as an overlay inside `app-tabs.tsx`, outside `<Tabs>`, seated in the bar's reserved middle lane and lifted 10pt clear of its top edge. Its `pointerEvents="box-none"` container lets tab touches pass through; only the visible circle is tappable, and it `router.push('/capture')` with a light impact haptic on iOS. It is an overlay rather than a tab because `/capture` is a root-stack modal, not a tab route. |
| Reserved capture lane | `Functional` | The bar's four items are `flex: 1`, so an overlay centered on the bar would land on top of the inner two rather than between them — with four tabs the clearance to the 스냅 and 무비 icons was ~6pt and the button ate ~31pt of each of their touch areas, so aiming at a tab could open the camera. The two inner items now each give up half of `CaptureLane` (`CaptureSize + CaptureGutter * 2` = 80pt) as a `marginEnd`/`marginStart`, which makes the bar lay out as five slots and leaves the lane exactly screen-centered. Clearance to the neighbouring icons is ~41pt on a 393pt-wide device, and no tab item's touch area is taken. The lane is derived from `CaptureSize` so the two cannot drift apart. |
| Translucent blurred tab bar | `Functional` | The bar is absolutely positioned with a transparent background and an `expo-blur` `BlurView` (`tabBarBackground`) so scene content shows through it — native blur on iOS, `dimezisBlurViewSdk31Plus` on Android (semi-transparent fallback below SDK 31); tint is always `dark` (the app is dark-fixed). On Android the blur needs an explicit sample source: each tab scene is wrapped (via the navigator's `screenLayout`) in a `BlurTargetView` and the focused scene registers itself as the bar's `blurTarget` — without it the native side silently falls back to the tint-only background. A hairline top border remains. Scrollable screens offset content by `useTabBarHeight` (`shared/ui/theme`) so nothing sits permanently behind the bar. |
| Modal capture entry | `Functional` | The center button opens `/capture` as a root-stack full-screen modal (`presentation: 'fullScreenModal'`, header hidden); a close button on the screen returns to the Studio. |
| Native animated splash transition | `Functional` | The system splash is hidden after the overlay lays out, then the overlay — the Snaply moment-ring mark (`assets/images/brand-glyph-ember.png`, 150dp) on the ground background — fades out. The overlay's resting frame mirrors the native `expo-splash-screen` config exactly, so the handoff is seamless. |
| Web splash transition | `Functional` | The overlay intentionally renders nothing on web. |
| Dark-fixed theme | `Functional` | The app is a single dark world: video reads better against near-black than against a bright surface. `useTheme`/`useResolvedColorScheme` always resolve to the one palette regardless of OS appearance; there is no light theme, no in-app theme toggle, and no stored theme preference. |
| Unified Android system navigation bar | `Functional` | The OS contrast scrim behind the Android 3-button navigation bar is disabled (`expo-navigation-bar` config plugin, `enforceContrast: false`), so the system buttons float directly over the tab bar's blur instead of sitting on a separate opaque strip. `AppProviders` renders `NavigationBar` with a fixed dark style so the buttons stay light over the dark shell. Gesture navigation and iOS are unaffected. |
| Fixed status bar and navigation theme | `Functional` | `AppProviders` uses the Expo Router `DarkTheme` recolored with the app palette and a fixed light `expo-status-bar` style. |
| Film-grain overlay | Removed | A faint grain texture used to be laid over the whole app. It was the film metaphor's defining texture, which the redesign drops; `shared/ui/film-grain` was deleted with it. |
| Daily-roll gate | Removed | A headless provider used to create "today's roll" on app entry. There is no daily roll any more, so the provider and its entity are gone. |
| Screen-owned bottom chrome takeover | `Functional` | A screen can claim the bottom of the shell for an action bar of its own through the `shared/ui/tab-bar-chrome` store: it flips the switch, and the navigator hides both the tab bar (`display: 'none'`) and the capture button. The one caller today is the Snap tab's selection mode ([Snap library](snaps.md)). The mechanism was briefly removed when the then-selection grid moved to a route that had no tab bar to hide, and restored when selection came back inside a tab — a screen cannot simply draw over the bar, because the navigator paints it above every scene. Whoever hides it owns restoring it; tying the flip to an effect's cleanup, conditioned on focus as well as on the screen's own state, is what keeps a stray navigation from stranding the app with no bottom chrome at all. |

## Route map

| Route | Presentation | Owner |
| --- | --- | --- |
| `/` | 스튜디오 tab | `pages/studio` |
| `/snaps` | 스냅 tab; accepts `?select=1` to open in selection mode and `?for=<movieId>` to pick into a movie | `pages/snaps` |
| `/movies` | 무비 tab | `pages/movies` |
| `/me` | 나 tab | `pages/me` |
| `/capture` | Headerless root-stack full-screen modal (opened by the center capture button); the viewfinder | `pages/capture-record` |
| `/movie/[id]` | Root-stack screen with a themed native header ("무비"); one movie at any point of its life | `pages/movie` |
| `/template/[id]` | Root-stack screen with a themed native header ("템플릿"); a template matched against the library | `pages/movie-template` |

`src/app` parses string search parameters where needed and passes them to page components as explicit props (`snaps.tsx` turns `?select=1` and `?for=<movieId>` into `startSelecting` and `forMovieId`). The `src/_app/routes` module owns stack and tab policies; page slices own screen content.

Both are pushed stack screens rather than tabs: each is a task with a beginning and an end, and each needs its own back affordance. There is deliberately **one** movie route — watching a finished movie and fixing it are the same visit, so a second one would have meant two places that can edit one cut list. A movie tile or studio row therefore has nothing to branch on: every movie, at every status, opens on `/movie/[id]` ([The movie screen](movie.md)).

## Composition and ownership

- `src/app/_layout.tsx` exposes `RootLayout` from the `_app` Public API.
- `src/_app/providers/app-providers.tsx` fixes the Expo Router navigation theme, status-bar style, and Android navigation-bar button style to the app palette. It also mounts three headless nodes for the whole authenticated session, none of which owns any UI: `PushTokenRegistrar` and `GeofenceGate` (see [Location alerts and push notifications](location-and-push-notifications.md)), and `MovieGenerationGate`, which carries a movie's generation job to its render from here rather than from the movie screen, so a job keeps running once the user leaves it and is picked back up on the next app start (see [The movie screen](movie.md)). It wraps its children in `GestureHandlerRootView`, the ancestor `react-native-gesture-handler` gestures require, which expo-router's native stack does not provide.
- `src/_app/routes/root-layout.tsx` composes providers, splash behavior, and stack presentations, and imports `register-background-tasks` for its side effect so the background geofence task is defined at startup (including on a headless OS relaunch).
- `src/_app/routes/app-tabs.tsx` is the single cross-platform tab navigator (`Tabs` from `expo-router`) with the four screens plus the `CaptureButton` overlay; there is no platform-specific tab variant.
- `src/shared/ui/theme` owns the palette (including the `amber`, `lumen`, `ai`, and `media` tokens), spacing, radii, content width, dark-fixed theme access, the Android top content inset helper, the tab bar height helper (`useTabBarHeight`) used to offset scrollable screens beneath the translucent bar, and the `useReducedMotion` accessibility helper that lets animated screens present their final state immediately. `TabBarContentHeight` (52pt, the bar above the safe-area inset) is sized to seat the capture button rather than be towered over by it; every scrollable screen follows it through `useTabBarHeight`.
- `src/shared/ui/tab-bar-chrome` owns the bottom-chrome switch shared by the tab navigator and any screen that replaces the bottom chrome with its own bar. It is business-agnostic: it knows something owns the bottom of the screen, not what or why.
- `src/shared/ui/fade-in-view` owns the mount fade-in used instead of Reanimated `entering` presets, which never start on iOS in Expo Go and left content invisible.

## Known limitations

- The tab bar is a JS-drawn React Navigation bar, not a platform-native tab bar; it has no haptics or scroll-to-minimize. Its background blur is native on iOS and uses the `expo-blur` Dimezis implementation on Android (semi-transparent fallback below SDK 31).
- The Android blur samples only the focused tab scene's subtree (the `BlurTargetView` wrapper), because Dimezis BlurView v3 forbids the `BlurView` from living inside its own target — wrapping the whole navigator (which contains the tab bar) is not possible. Content rendered outside the scene, such as a root-stack modal sliding over the tabs, is not reflected in the bar's blur on Android.
- The splash animation is native-only.
- The theme is dark-fixed; the OS appearance setting has no effect.
- Expo Router's generated route types (`.expo/types/router.d.ts`) are a gitignored build artifact. They were stale after the route set changed, so the file was removed; it regenerates on the next `expo start`, and typed-route checking is unavailable until then.
