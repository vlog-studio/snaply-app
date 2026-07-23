# Capture flow

## User goal and screen flow

Users open capture from Home, choose a mood and clip duration, capture a short clip in the darkroom viewfinder, review the saved original, then watch it develop and play back as a reel. The three signature stages are dressed in the moment-collection darkroom visual language: **viewfinder → develop ceremony → reel** (담기 → 현상 → 릴).

```text
/ (Home safelight capture ring)
  -- open capture --> /capture (root-stack modal, mood/duration picker)
  -- mood + duration --> /capture/record   (viewfinder)
  -- saved clip --> /capture/editing        (develop ceremony)
  -- simulated develop --> /capture/result  (reel player)
  -- action --> /archive or /capture
```

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
| Automatic local persistence | `Functional` | A completed temporary recording is moved into the app document directory before review. |
| Recording review and retake | `Functional` | The saved original loops in the review stage; retake returns to the camera without deleting that saved original. |
| Select a previous recording | `Functional` | The in-screen recording library can select or delete a locally stored original. |
| Web recording | `Prototype` | The shutter is disabled and the UI explains that recording requires iOS or Android. |

The page uses four explicit stages: `idle`, `recording`, `saving`, and `review`, presented as a darkroom viewfinder — a film-black surface with mono edge-print overlays ("오늘의 롤 · 무드 · N초", a "꾹 눌러 담기" film-gate hint, an ember REC dot, and a lumen "담김 · 미현상" badge after save) and an ember safelight shutter. Capture and recording-library failures are displayed inside the camera screen and can be dismissed. This is a visual reskin only — capture is still a tap on the shutter, not the concept's press-and-hold ring.

Closing the recorder mid-recording stops the camera and discards the in-flight clip; nothing is persisted. The on-screen countdown is display-only — the actual stop is driven by the native `maxDuration`, so after the counter reaches zero the badge shows a finishing state until the recording completes.

The camera-permission-denied screen still exposes the recording library, so users can browse, select (which enters the review stage), and delete saved originals without camera permission.

## Develop ceremony and reel presentation

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Develop ceremony | `Prototype` | `pages/capture-editing` increments an in-memory timer from 0 to 100 percent, presented as the darkroom develop ceremony: a stack of film-black frames whose color blooms in as a cold lumen scan line sweeps top→bottom (both driven by the timer), under a deepening amber safelight glow. No media processing occurs. |
| Reel playback preview | `Prototype` | The reel (`pages/capture-result`) is a styled dark reel-player card (edge print, "현상 완료" badge, play button, mood pill, progress bar), not the selected recording. |
| Reel edit summary | `Prototype` | The "이 릴에 들어간 것" tags (BGM, 전환, 톤 보정) are static. |
| Add developed reel to archive | `Prototype` | No developed reel or roll metadata is persisted. The original clip was already saved during capture. |
| Reel navigation | `Functional` | Users can replace the route with Archive or return to Capture Setup. |

The selected recording URI or ID is not passed from `/capture/record` to `/capture/editing` or `/capture/result`. Only mood and duration cross those route boundaries. Any future real editing pipeline must establish durable session or recording identity rather than relying on the current presentation flow.

## Ownership and dependencies

- `src/pages/capture-setup` owns setup-only selection state.
- `src/pages/capture-record` owns camera lifecycle, permissions, capture-stage orchestration, and its internal recording-library modal.
- `src/pages/capture-editing` (develop ceremony) and `src/pages/capture-result` (reel player) own the current simulated presentation.
- `src/entities/capture-session` owns capture option types, labels, and route-value normalization.
- `src/features/manage-recordings` owns reusable local-recording state/actions and formatting.
- `src/shared/ui/video-preview` owns the business-agnostic looping video player used in the review step.
- `src/shared/lib/recording-files` adapts Expo FileSystem and supplies the web fallback.

## Persistence and privacy

Original recordings are stored only in the Snaply app's document directory. They are not exported to the system media library, uploaded, shared, or synchronized. Removing the app also removes its recordings. See [Recording archive](recording-archive.md) for file behavior and management surfaces.
