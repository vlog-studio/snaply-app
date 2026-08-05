# Animations and gestures

How to implement motion and gesture-driven interactions in this project with
`react-native-reanimated` 4 and `react-native-gesture-handler` (RNGH) 2. Like the
other framework documents this records placement rules, the canonical files to
imitate, and the pitfalls already paid for — read it before adding any animation
or gesture code. Base API usage on the official
[Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/) and
[Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/docs/)
documentation for the installed versions; this document does not restate their APIs.

## Setup facts (already done — do not repeat)

- The worklets Babel plugin is applied automatically by `babel-preset-expo`
  (`react-native-worklets/plugin`). There is no project `babel.config.js` to edit.
- `GestureHandlerRootView` is mounted once in `src/_app/providers/app-providers.tsx`,
  wrapping the whole authenticated tree. RNGH gestures anywhere in the app rely on
  it; never mount a second one.
- Reanimated and RNGH are already native dependencies in the dev builds — new
  animation code needs no rebuild.

## Canonical implementations

Imitate the closest existing implementation instead of inventing a new shape.

| Need | Canonical file | Shape |
| --- | --- | --- |
| Mount fade/slide-in | `src/shared/ui/fade-in-view/fade-in-view.tsx` | Shared value driven by `withTiming` in a mount effect; reusable wrapper with `delay`/`duration` props |
| One-shot choreography with a completion callback | `src/pages/capture-record/ui/capture-flight.tsx` | `withTiming` + `runOnJS` completion; callback held in a ref so the worklet never captures a stale closure |
| Gesture/state-driven progress indicator | `src/pages/capture-record/ui/hold-ring.tsx` | Shared value + `useAnimatedProps` on an SVG element; fills while a prop is true, rewinds on release |
| Positional reflow of in-flow items (FLIP) | `src/pages/movie/ui/timeline-cut.tsx` (`shiftX`) | Flex still owns placement; when an item's slot index changes, an effect pulls it back by `oldX - newX` via a translate shared value and springs it to 0. Keyed to the *slot* changing — not the coordinate — so layout shifts that already animated live (a neighbour's trim drag) are not replayed |
| Splash exit | `src/_app/routes/animated-splash-overlay.tsx` | The one `Keyframe`/`entering` usage in the app (see the Expo Go caveat below before adding another) |

> The drag-reorder grid (`cut-sheet-grid.tsx` + `reorder-layout.ts`) was removed with
> the roll sheet in the studio rebuild. The rules it taught are kept below, because the
> movie editor's cut list is the same problem; recover the implementation from git
> history (`git show f3324b1:src/pages/roll-detail/ui/cut-sheet-grid.tsx`) rather than
> reinventing it.

## Rules

### Respect reduced motion

Every signature animation reads `useReducedMotion()` from `@/shared/ui/theme` and
presents the final state immediately (or a static equivalent, like `HoldRing`'s
partial arc) instead of animating. This is a product rule (concept §7 저감 모션),
not an optimization.

### Prefer runtime shared-value animations over `entering`/`exiting` presets

Reanimated entering presets (`FadeInDown`, `ZoomIn`, …) never start on iOS in Expo
Go, leaving views stuck at opacity 0 (recorded in `fade-in-view.tsx`). Drive mount
animations from a shared value in an effect instead. `AnimatedSplashOverlay`'s
`Keyframe` is the lone exception; verify on iOS before adding another.

### Keep per-frame state on the UI thread

State that changes every frame (drag position, progress, the visual order of a
drag grid) lives in shared values, mutated by worklets. Mirror it to React state
via `runOnJS` only at meaningful boundaries (a slot swap, a completion) — for
labels, badges, or commit payloads — never per frame. The commit itself stays a
plain store/feature call made from the JS side (the grid reports the order; the page
commits it).

### Extract decision math into the `model` segment, worklet-marked, unit-tested

Geometry and ordering rules a gesture evaluates ("which slot is the finger over",
"what does the order become") are pure functions in the slice's `model/` with a
`'worklet'` directive (`reorder-layout.ts` did this). The directive is inert under Jest, so
the same functions get table-driven unit tests. Animation timing itself is not
unit-testable — verify it on device and test the math instead.

### Work around the React Compiler lint, structurally

`eslint-plugin-react-hooks` (compiler-powered) rejects shared-value `.value` writes
it thinks happen during render: inside `useMemo`, and inside gesture-builder
callbacks (`Gesture.Pan().onStart(...)`) defined in the component body. `'use no
memo'` does **not** silence it. The accepted fix is structural: build the gesture in
a plain module-level factory that takes the shared values as arguments
(`buildDragGesture` did this). Writes inside `useEffect`,
`useAnimatedReaction`, and `useAnimatedStyle` are fine.

### Gestures inside scrollables

- Use `.activateAfterLongPress(...)` so the scroll gesture keeps working; on
  activation give haptic feedback (`Haptics.impactAsync(Medium)` — the established
  lift/collect cue) and lock the scroll (`scrollEnabled={!dragActive}` via a
  `runOnJS` state flip) until the gesture settles.
- Match the long-press delay to the sibling `Pressable`'s `delayLongPress` (260ms
  today) so gesture entries feel like one family.
- Build gestures inline in render (no memo): `GestureDetector` reconciles the
  native handler on re-render without cancelling an active gesture, and the inline
  build keeps worklet captures fresh.

### Never let a mode change remount animated content

Swapping component trees to change interaction modes causes a visible blink: a
remounted `expo-image` cannot paint its first frame even from the memory cache, and
a self-measuring (`onLayout`) container renders empty for a frame. The rules learned
from the roll sheet:

- One component tree for all modes; toggle behavior with props (`Pressable`
  `disabled`, `Gesture.enabled(...)`), not by swapping components.
- Derive layout width from `useWindowDimensions` + the known content constraints
  instead of measuring, when the container's width is deterministic.
- Thumbnails: `useVideoThumbnail` answers synchronously for frames already resolved
  this session, and `VideoFrame` uses `cachePolicy="memory-disk"` and skips its
  fade when the frame was known at mount. Keep those properties intact.
- `expo-video`'s `useVideoPlayer` keys the native player on its *serialized source
  argument*: hand it a source expression that can change across renders and the
  player is torn down and rebuilt in place — a remount-blink issued by a hook, with
  every ref that described the old player left dangling. Pin the hook's source to a
  mount-time value (lazy `useState`) and make every later source change through
  `player.replaceAsync(...)` (`cut-player.tsx` is the canonical shape; the same
  reload blanks the frame even for an unchanged file, so avoid it when the player
  already holds the file).
- Two more Android facts from the same file: a `VideoView` renders on a
  SurfaceView by default, which the system composites *outside* the view
  hierarchy — view `opacity` does not apply, so any show/hide-by-opacity
  choreography (the stage's double buffer) silently shows the top view instead;
  pass `surfaceType="textureView"` where opacity has to work. And a player's
  `timeUpdate` fires on its interval **even while paused**, reporting the parked
  position — position-driven logic (boundary advances, follow-up seeks) must be
  gated on "meant to be playing" or it acts on parked frames four times a second.

### Motion values

The house style is fast and settled — film equipment, not rubber:

- Fades/mount motion: `withTiming`, 280–600ms, `Easing.out(Easing.cubic)`.
- Micro state changes (lift scale): ~120ms timing.
- Positional reflow (drag grids): near-critically-damped springs — reference
  `{ damping: 44, stiffness: 300 }` from `cut-sheet-grid.tsx`; items glide into
  place with no visible bounce. Start from these values and tune on device.

## Verification

JS tests cover only the extracted pure math and any hook logic. The animation
itself — timing, gesture feel, frame drops, haptics — needs on-device verification
per [`local-development-and-testing.md`](../workflows/local-development-and-testing.md)
and [`android-device-verification.md`](../workflows/android-device-verification.md).
Verify reduced-motion behavior by toggling the OS setting, not by mocking.
