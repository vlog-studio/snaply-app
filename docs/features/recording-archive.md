# Recording archive

## User goal

Users can manage original recordings stored inside Snaply and can view a prototype of the intended completed-vlog archive.

## Original recording management

| Capability | Status | Notes |
| --- | --- | --- |
| Persist completed camera recording | `Functional` | Native temporary media is moved into `document/recordings`. |
| List recordings newest first | `Functional` | Video files are mapped to metadata and sorted by creation or modification time. |
| Display date and file size | `Functional` | Korean localized date/time formatting comes from `features/manage-recordings`; business-agnostic KB/MB formatting comes from `shared/lib/format-file-size`. |
| Play a recording | `Functional` | Archive playback uses a full-screen looping `expo-video` view with native controls. |
| Delete a recording | `Functional` | Users confirm destructive deletion; the adapter rejects files outside Snaply's recordings directory. |
| Refresh after navigation | `Functional` | The Archive page reloads recordings whenever it receives focus. |
| Loading, empty, and error states | `Functional` | The screen distinguishes initial loading, no recordings, and list-operation failures. |
| Web persistence | `Prototype` | The web adapter returns an empty list, rejects persistence, and performs no deletion. |

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

## Completed-vlog archive

The “브이로그” segment is a `Prototype`.

- The completed item, date, duration, clip count, preview colors, emoji, and AI-editing label are static fixtures.
- Its preview action opens `/capture/result` with fixed `mood=hip` and `duration=3` parameters.
- The previous-day empty card is also static.
- No edited video, capture grouping, or vlog record exists in storage.

## Ownership

- `src/pages/archive` owns the two archive segments, archive-specific UI, playback modal, and prototype vlog fixtures.
- `src/features/manage-recordings` owns reusable recording operations and formatting.
- `src/shared/ui/video-preview` owns the business-agnostic looping video player used by the playback modal.
- `src/shared/lib/recording-files` owns native file operations and the web fallback.
- `src/entities/capture-session` is not currently connected to persisted recordings; `LocalRecording` contains no mood or duration metadata.

## Known limitations

- A recording stores file metadata only, so archive items cannot display capture mood, requested duration, or actual duration.
- There is no thumbnail extraction; recording rows use a generic play tile.
- There is no share/export action, media-library save, cloud backup, or recovery after app deletion.
- Deleting an original is permanent and is not mediated by a trash state.
- The delete confirmation uses `Alert.alert`, which is a no-op on react-native-web; this is currently unreachable on web because the web adapter lists no recordings, but a web persistence implementation must also replace the confirmation UI.
