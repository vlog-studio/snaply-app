# Recording archive

## User goal

Users can manage the original clips ("컷") stored inside Snaply and browse the shelf of developed rolls ("롤"). The Archive is a segmented view: "컷" is the live clip list, "롤" is the live shelf of developed rolls. Both are dressed in the moment-collection darkroom visual language (edge prints, film-black clip tiles, roll covers with "현상 완료" badges).

## Original recording management

| Capability | Status | Notes |
| --- | --- | --- |
| Persist completed camera recording | `Functional` | Native temporary media is moved into `document/recordings`. |
| List recordings newest first | `Functional` | Video files are mapped to metadata and sorted by creation or modification time. |
| Grid layout | `Functional` | The "컷" segment renders a three-column grid of clip cells (newest first) instead of a list. |
| Day-grouped view | `Functional` | A "최신순 / 일자별" toggle switches the grid between one flat newest-first grid and per-day sections; the day heading labels today/yesterday relatively and older days with a full Korean date. |
| First-frame thumbnails | `Functional` | Each grid cell shows the clip's first frame, extracted with `expo-video-thumbnails` and cached under the cache directory by source file name; a film-cell placeholder shows while loading or if extraction fails. |
| Display date and file size | `Functional` | Korean localized date/time formatting comes from `features/manage-recordings`; business-agnostic KB/MB formatting comes from `shared/lib/format-file-size`. Grid cells show only the time of day; the playback modal shows the full date and size. |
| Play a recording | `Functional` | Tapping a cell (outside selection mode) opens a full-screen looping `expo-video` view with native controls. |
| Delete a recording | `Functional` | The capture-record library still deletes one clip at a time; the adapter rejects files outside Snaply's recordings directory. |
| Select and batch-delete clips | `Functional` | Long-pressing a grid cell enters selection mode: the tab bar and safelight hide and a bottom action bar (취소 · N개 선택 · 전체선택 · 삭제) slides up in their place. One confirmation deletes all selected clips, committing the ones that succeed even if some fail; deleting a clip also removes its cached thumbnail. Android hardware back exits selection mode; leaving the screen exits it and restores the tab bar. |
| Refresh after navigation | `Functional` | The Archive page reloads recordings whenever it receives focus. |
| Loading, empty, and error states | `Functional` | The screen distinguishes initial loading, no recordings, and list-operation failures. |
| Web persistence | `Prototype` | The web adapter returns an empty list, rejects persistence, and performs no deletion; the web thumbnail adapter returns no thumbnail. |

The same reusable management capability is consumed in two places:

- `pages/capture-record` uses it to save a new recording and to select/delete recordings in a full-screen modal.
- `pages/archive` uses it to reload, list, play, and delete originals.

This reuse is why `features/manage-recordings` is a feature slice rather than page-local code.

## File model and storage boundary

`shared/lib/recording-files` owns the business-agnostic file adapter.

```text
LocalRecording
├── id          file name
├── uri         local file URI
├── fileName    file name
├── size        bytes
└── createdAt   creation time, last-modified fallback, or current time
```

Accepted video extensions are `.m4v`, `.mov`, `.mp4`, and `.webm`. New files are named `snaply-<timestamp>.<extension>` and live in the app document directory's `recordings` folder.

Recordings are app-private local files. They are not entries in the device media library and are not synchronized to a backend. App deletion removes them.

Thumbnails are derived cover art, not part of `LocalRecording`. The extraction and caching live in the generic `shared/lib/video-thumbnails` util, which pulls the first frame on first request and caches it under the cache directory keyed by the source file's base name (`<base>.jpg`); `shared/lib/recording-thumbnails` is a thin adapter that maps `LocalRecording` onto it. Because the cache key is the base name, the same file resolves to one thumbnail shared across every surface that previews it (the cut grid, Home's contact-sheet strip, and roll-detail negatives). Losing the cache only forces re-extraction; it never loses a clip. The web variant returns no thumbnail.

## Developed-roll shelf

The “롤” segment is `Functional`, backed by the real roll store.

- The shelf lists developed rolls only (status `developed` with a persisted reel), newest-developed first (`widgets/developed-rolls-shelf` joins `entities/roll` + `entities/clip`; the read model is shared with the home shelf preview).
- Each cover shows the roll's day key, clip count, and total reel length (summed from the referenced clips' durations), plus a "현상 완료" badge. Cover tints are cycled by shelf position (rolls carry no color of their own yet).
- Tapping a cover opens `/capture/result?rollId=<id>` and plays that roll's reel sequentially (see [Capture flow](capture-flow.md)).
- When no roll is developed yet, the segment shows an empty state prompting the user to develop today's roll. A trailing dashed "빈 롤" slot is decorative (non-interactive); manual roll creation is not part of the MVP.

## Ownership

- `src/pages/archive` owns the two archive segments (컷 / 롤), archive-specific UI, and the playback modal; it renders the shelf grid from the `widgets/developed-rolls-shelf` read model.
- `src/widgets/developed-rolls-shelf` owns the developed-rolls read model (`useDevelopedRolls`, `formatReelLength`) joining `entities/roll` + `entities/clip`, shared with the home shelf preview.
- `src/entities/roll` and `src/entities/clip` back the roll shelf (developed rolls and clip durations).
- `src/features/manage-recordings` owns reusable recording operations (single and batch delete), date/time/day formatting, and the `useRecordingThumbnail` hook.
- `src/pages/archive/ui/cut-cell` owns the grid cell (thumbnail, clip number, selection checkbox).
- `src/pages/archive/ui/cut-selection-bar` owns the bottom action bar shown during selection mode.
- `src/shared/ui/tab-bar-chrome` owns the hidden/visible switch for the bottom chrome; `_app/routes/app-tabs` reads it to hide the tab bar and safelight while a screen shows its own action bar.
- `src/shared/ui/video-preview` owns the business-agnostic looping video player used by the playback modal.
- `src/shared/lib/recording-files` owns native file operations and the web fallback.
- `src/shared/lib/video-thumbnails` owns first-frame extraction/caching (keyed by base name) and the web fallback; `src/shared/lib/recording-thumbnails` is the `LocalRecording` adapter over it.
- `src/entities/capture-session` is not currently connected to persisted recordings; `LocalRecording` contains no mood or duration metadata.

## Known limitations

- A recording stores file metadata only, so archive items cannot display capture mood, requested duration, or actual duration.
- Clip cells now show real first-frame thumbnails, but roll covers still use generic tints rather than real cover art.
- There is no share/export action, media-library save, cloud backup, or recovery after app deletion.
- Deleting an original (single or batch) is permanent and is not mediated by a trash state.
- The delete confirmation uses `Alert.alert`, which is a no-op on react-native-web; this is currently unreachable on web because the web adapter lists no recordings, but a web persistence implementation must also replace the confirmation UI.
