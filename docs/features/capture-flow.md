# Capture flow

## User goal and screen flow

Users open capture from Home, choose a mood and clip duration, and capture a short clip in the darkroom viewfinder. In the MVP "delayed develop" loop, the captured moment is collected into **today's roll** as an undeveloped clip and the user is returned Home — the completed reel is deliberately not shown at capture time. Developing a roll into a reel happens later, initiated from the roll's detail screen ([Roll detail](roll-detail.md)).

```text
/ (Home safelight capture ring)
  -- open capture --> /capture (root-stack modal, mood/duration picker)
  -- mood + duration --> /capture/record   (viewfinder)
  -- clip collected into today's roll --> / (Home)   (capture loop ends here; the clip is undeveloped)

/roll/[id] (Roll detail)
  -- 현상하기 --> /capture/editing   (develop ceremony; composes and persists the reel)
  -- 릴 공개 --> /capture/result     (sequential reel player)
```

The develop ceremony (`/capture/editing`) and reel player (`/capture/result`) are now driven by real roll data (`rollId`), not the capture flow. They are reached from Roll detail, not from the recorder; the recorder's library is browse/preview/delete only.

The supported capture options are owned by `entities/capture-session`:

- Moods: `hip`, `lovely`, and `energy`
- Durations: 3 or 5 seconds
- Invalid or missing route values normalize to `hip` and 3 seconds

## Capture setup

`pages/capture-setup` owns the setup form as local React state. Selecting a mood triggers selection haptics on iOS. The page passes the selected mood and duration as route parameters to `/capture/record`.

The setup screen is presented by the root stack as a modal (`presentation: 'modal'`, header hidden), so the tab bar is not part of this presentation and no tab-bar visibility toggle is needed. A close button in the hero returns to Home. The mood accents are tuned to the darkroom palette (ember / warm rose / lumen). The start button is docked in a fixed footer below the scrollable option list, padded by the bottom safe area, so it stays visible without scrolling. Its label reflects the selected duration ("N초 담기 시작").

The optional `context=cafe` parameter only displays a recommendation banner. Context detection itself is not implemented.

## Camera recording and review

| Capability | Status | Platform and behavior |
| --- | --- | --- |
| Camera and microphone permission flow | `Functional` | iOS and Android request missing permissions and can open system settings after denial. |
| 3- or 5-second video recording | `Functional` | iOS and Android record at 720p and stop at the selected maximum duration; users can stop early. |
| Sound toggle | `Functional` | Recording can be muted; enabling sound requires microphone permission. During review the toggle mutes/unmutes the looping playback without restarting it. |
| Front/back camera toggle | `Functional` | Available while the recorder is idle. |
| 담기 (collect into today's roll) | `Functional` | On capture completion the temporary recording is moved into the app document directory, a clip is created from it, and the clip is added to today's daily roll (auto-created on the first capture of the day). The user is then returned Home. Owned by `features/capture-moment`. |
| Select a previous recording | `Functional` | The in-screen recording library can select (enters a preview/review stage) or delete a locally stored original. |
| Web recording | `Prototype` | The shutter is disabled and the UI explains that recording requires iOS or Android. |

The page uses four explicit stages: `idle`, `recording`, `saving`, and `review`, presented as a darkroom viewfinder — a film-black surface with mono edge-print overlays ("오늘의 롤 · 무드 · N초", a "꾹 눌러 담기" film-gate hint, an ember REC dot, and a "컷을 담는 중…" badge while saving) and an ember safelight shutter. On successful capture the app returns Home (the `review` stage is now reached only by selecting a recording from the library, not by capturing). Capture, 담기, and recording-library failures are displayed inside the camera screen and can be dismissed. Capture is still a tap on the shutter, not the concept's press-and-hold ring.

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

- `src/pages/capture-setup` owns setup-only selection state.
- `src/pages/capture-record` owns camera lifecycle, permissions, capture-stage orchestration, and its internal recording-library modal.
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
