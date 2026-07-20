# Capture flow

## User goal and screen flow

Users open capture from the Home contextual card, choose a mood and clip duration, record a short video, review the saved original, and continue through an AI-editing presentation to a result screen.

```text
/ (Home contextual card)
  -- open capture --> /capture (root-stack modal)
  -- mood + duration --> /capture/record
  -- saved recording --> /capture/editing
  -- simulated completion --> /capture/result
  -- action --> /archive or /capture
```

The supported capture options are owned by `entities/capture-session`:

- Moods: `hip`, `lovely`, and `energy`
- Durations: 3 or 5 seconds
- Invalid or missing route values normalize to `hip` and 3 seconds

## Capture setup

`pages/capture-setup` owns the setup form as local React state. Selecting a mood triggers selection haptics on iOS. The page passes the selected mood and duration as route parameters to `/capture/record`.

The setup screen is presented by the root stack as a modal (`presentation: 'modal'`, header hidden), so the tab bar is not part of this presentation and no tab-bar visibility toggle is needed. A close button in the hero returns to Home. The start-recording button is docked in a fixed footer below the scrollable option list, padded by the bottom safe area, so it stays visible without scrolling. Its label reflects the selected duration.

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

The page uses four explicit stages: `idle`, `recording`, `saving`, and `review`. Capture and recording-library failures are displayed inside the camera screen and can be dismissed.

Closing the recorder mid-recording stops the camera and discards the in-flight clip; nothing is persisted. The on-screen countdown is display-only — the actual stop is driven by the native `maxDuration`, so after the counter reaches zero the badge shows a finishing state until the recording completes.

The camera-permission-denied screen still exposes the recording library, so users can browse, select (which enters the review stage), and delete saved originals without camera permission.

## Editing and result presentation

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Editing progress | `Prototype` | `pages/capture-editing` increments an in-memory timer from 0 to 100 percent. No media processing occurs. |
| Edited media preview | `Prototype` | The editing and result previews are styled placeholder cards, not the selected recording. |
| Effects and sound selection | `Prototype` | Labels for sparkles, sound effects, and a warm filter are static. |
| Add completed vlog to archive | `Prototype` | No edited output or vlog metadata is persisted. The original recording was already saved during capture. |
| Result navigation | `Functional` | Users can replace the route with Archive or return to Capture Setup. |

The selected recording URI or ID is not passed from `/capture/record` to `/capture/editing` or `/capture/result`. Only mood and duration cross those route boundaries. Any future real editing pipeline must establish durable session or recording identity rather than relying on the current presentation flow.

## Ownership and dependencies

- `src/pages/capture-setup` owns setup-only selection state.
- `src/pages/capture-record` owns camera lifecycle, permissions, capture-stage orchestration, and its internal recording-library modal.
- `src/pages/capture-editing` and `src/pages/capture-result` own the current simulated presentation.
- `src/entities/capture-session` owns capture option types, labels, and route-value normalization.
- `src/features/manage-recordings` owns reusable local-recording state/actions, formatting, and video preview.
- `src/shared/lib/recording-files` adapts Expo FileSystem and supplies the web fallback.

## Persistence and privacy

Original recordings are stored only in the Snaply app's document directory. They are not exported to the system media library, uploaded, shared, or synchronized. Removing the app also removes its recordings. See [Recording archive](recording-archive.md) for file behavior and management surfaces.
