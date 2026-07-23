# Capture flow

## User goal and screen flow

Users open capture from the center safelight button, land directly in the darkroom viewfinder, tune the mood and clip duration inline, and capture a short clip. In the MVP "delayed develop" loop, the captured moment is collected into **today's roll** as an undeveloped clip and the user is returned Home — the completed reel is deliberately not shown at capture time. Developing a roll into a reel happens later, initiated from the roll's detail screen ([Roll detail](roll-detail.md)).

```text
/ (tab bar center safelight button)
  -- open capture --> /capture   (root-stack full-screen modal, darkroom viewfinder with inline mood/duration options)
  -- press-and-hold, clip collected into today's roll --> / (Home)   (capture loop ends here; the clip is undeveloped)

/roll/[id] (Roll detail)
  -- 현상하기 --> /capture/editing   (develop ceremony; composes and persists the reel)
  -- 릴 공개 --> /capture/result     (sequential reel player)
```

There is no longer a separate mood/duration setup screen: the options are tuned inline in the viewfinder (see [Capture options](#capture-options)). The develop ceremony (`/capture/editing`) and reel player (`/capture/result`) are driven by real roll data (`rollId`), not the capture flow. They are reached from Roll detail, not from the recorder; the recorder's library is browse/preview/delete only.

The supported capture options are owned by `entities/capture-session`:

- Moods: `hip`, `lovely`, and `energy`
- Durations: 3 or 5 seconds
- Invalid or missing values normalize to `hip` and 3 seconds; these defaults seed the recorder's initial option state

## Capture options

The mood and duration are tuned inline in the viewfinder, not on a separate setup screen. `/capture` opens straight into the recorder (`pages/capture-record`), which owns the selected mood and duration as local React state, seeded with the `entities/capture-session` defaults (`hip`, 3s).

While the recorder is `idle`, an options bar sits above the shutter: three mood chips (🔥 힙하게 / 💕 러블리하게 / ⚡ 신나게, accented with the darkroom ember / warm rose / lumen palette) and a `3초 / 5초` segment toggle. Selecting either triggers selection haptics on iOS and, for duration, resets the on-screen countdown. The options bar is hidden once a hold starts (`recording`/`saving`) and in the `review` stage, keeping the darkroom viewfinder clean; the top pill reads just "오늘의 롤". Because options can only change while idle, each collected clip is committed with the mood and duration shown at the moment the hold began.

The former `context=cafe` recommendation banner was removed with the setup screen; context detection was never implemented.

## Camera recording and review

| Capability | Status | Platform and behavior |
| --- | --- | --- |
| Camera and microphone permission flow | `Functional` | iOS and Android request missing permissions and can open system settings after denial. |
| Press-and-hold 3- or 5-second video recording | `Functional` | iOS and Android record at 720p while the shutter is held. Releasing the finger stops the recording early; the native `maxDuration` ends it automatically when the ring completes. Holds of 250ms or less are treated as accidental taps: the temp recording is discarded (never collected) and the screen silently returns to idle. |
| Sound toggle | `Functional` | Recording can be muted; enabling sound requires microphone permission. During review the toggle mutes/unmutes the looping playback without restarting it. |
| Front/back camera toggle | `Functional` | Available while the recorder is idle. |
| 담기 (collect into today's roll) | `Functional` | On capture completion the temporary recording is moved into the app document directory, a clip is created from it, and the clip is added to today's daily roll (auto-created on the first capture of the day). The user is then returned Home. Owned by `features/capture-moment`. |
| Select a previous recording | `Functional` | The in-screen recording library can select (enters a preview/review stage) or delete a locally stored original. |
| Web recording | `Prototype` | The shutter is disabled and the UI explains that recording requires iOS or Android. |

The page uses four explicit stages: `idle`, `recording`, `saving`, and `review`, presented as a darkroom viewfinder — a film-black surface with mono edge-print overlays ("오늘의 롤 · 무드 · N초", a "꾹 눌러 담기" film-gate hint, an ember REC dot, and a "컷을 담는 중…" badge while saving) and an ember safelight shutter. Capture is the concept's press-and-hold ring gesture (concept §7): recording runs only while the shutter is held, and a safelight progress ring around the shutter (`ui/hold-ring.tsx`, react-native-svg stroke-dashoffset driven by Reanimated) fills linearly over the selected duration, rewinding over 250ms on release. When the OS "reduce motion" setting is on, the ring shows a static partial arc as the holding indicator instead of a continuous fill. The accidental-tap threshold is owned by `model/hold-gesture.ts`. On successful capture the app returns Home (the `review` stage is now reached only by selecting a recording from the library, not by capturing). Capture, 담기, and recording-library failures are displayed inside the camera screen and can be dismissed.

Closing the recorder mid-recording stops the camera and discards the in-flight clip; nothing is persisted. The on-screen countdown is display-only — the actual stop is driven by the native `maxDuration`, so after the counter reaches zero the badge shows a finishing state until the recording completes.

The camera-permission-denied screen still exposes the recording library, so users can browse, select (which enters the review stage), and delete saved originals without camera permission.

## Develop ceremony and reel presentation

This flow operates on a real roll (`rollId`), reached from [Roll detail](roll-detail.md)'s 현상하기.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Develop ceremony | `Partial` | `pages/capture-editing` runs a 0→100 progress animation (film-black frames blooming under a cold lumen scan line and deepening amber glow). On completion it composes and persists the roll's reel via `features/develop-roll` and moves the roll `undeveloped → developing → developed`. The animation itself is a timed presentation, not media processing, but the develop effect (reel composition + status) is real. Honors reduced motion: when the OS "reduce motion" setting is on, the scan/bloom is skipped and the ceremony jumps straight to the completed state (concept §7). |
| Auto-combine (reel composition) | `Functional` | `features/develop-roll` builds the reel deterministically: clips ordered by their reference order, BGM chosen from the dominant clip mood, and a cut/fade transition chosen by clip count. This is the MVP rules-based combine (not AI). |
| Reel playback | `Functional` | The reel (`pages/capture-result`) plays the roll's clips back-to-back using **double-buffered** `expo-video` players: while one clip plays, the next is preloaded and paused on its first frame, so each `playToEnd` swap is seam-free (no black flash). Play/pause and replay are supported; per-clip progress segments show position. It is a sequential playlist, not a single rendered file. |
| Reel edit summary | `Partial` | The "이 릴에 들어간 것" tags show the reel's real transition and clip count; a generic BGM tag stands in for the (not-yet-audible) track. |
| Persisted developed reel | `Functional` | The composed reel and the `developed` status are persisted on the roll (via `shared/lib/local-store`), so Roll detail shows 현상됨 and offers "릴 보기". |
| Reel navigation | `Functional` | Users can replace the route with Archive or return to Capture Setup. |

MVP honesty (see mvp-implementation-plan.md §5): the reel is a sequential playlist rather than a single exported MP4; there is no real BGM audio or AI editing. The final combined video is intended to be produced separately (AI-merged, downloadable), so the in-app reel is a preview; double buffering keeps its clip transitions seam-free. If the roll has no clips or no reel yet, the result screen shows an empty state instead of a player.

## Ownership and dependencies

- `src/pages/capture-record` owns camera lifecycle, permissions, capture-stage orchestration, the inline mood/duration option state (idle-only), and its internal recording-library modal.
- `src/features/capture-moment` owns the 담기 action: persisting the clip file, building clip metadata, and adding the clip to today's roll (creating the daily roll on first capture). It owns its own pending/error state and does not navigate.
- `src/entities/clip` owns clip metadata and its persisted store; `src/entities/roll` owns rolls, today's-roll selection/creation, and clip membership.
- `src/_app/providers/daily-roll-gate.tsx` ensures today's roll exists on app entry (after the roll store hydrates).
- `src/features/develop-roll` owns the 현상 action: rules-based reel composition (`compose-reel`) and the `undeveloped → developing → developed` transition with reel persistence.
- `src/pages/capture-editing` (develop ceremony) drives the animation and triggers develop on completion; `src/pages/capture-result` (reel player) resolves the roll's reel to clip URIs (`use-reel`) and plays them sequentially (`reel-player`).
- `src/entities/capture-session` owns capture option types, labels, and route-value normalization.
- `src/features/manage-recordings` owns reusable local-recording state/actions and formatting (the recording library and archive).
- `src/shared/ui/video-preview` owns the business-agnostic looping video player used in the recorder review step.
- `src/shared/lib/recording-files` adapts Expo FileSystem and supplies the web fallback; `src/shared/lib/local-store` persists clip/roll metadata as document-directory JSON.

## Persistence and privacy

Original recordings are stored only in the Snaply app's document directory. They are not exported to the system media library, uploaded, shared, or synchronized. Removing the app also removes its recordings. See [Recording archive](recording-archive.md) for file behavior and management surfaces.
