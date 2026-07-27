# Recording archive

## User goal

Users can see which rolls are still waiting to be developed, browse the rolls they have developed, and manage the original cuts behind them.

The Archive is the **film cabinet** (`/archive`): one scroll reading anticipation → what you own → raw material. The 컷/롤 segmented control is gone; the cuts moved behind a drawer at the bottom of the cabinet that opens the pushed `/cuts` screen. Both screens keep the darkroom visual language (edge prints, film-black tiles, blurred negatives for anything undeveloped).

```text
/archive  (film cabinet)
├── 현상 대기        today's roll + every roll still holding an undeveloped reel
├── 현상 완료 · YYYY.MM   developed rolls by month, plus that month's empty-day count
└── 모든 컷 ›        drawer → /cuts

/cuts     (every original cut)
└── grid, day grouping, playback, selection, batch delete
```

## Film cabinet

| Capability | Status | Notes |
| --- | --- | --- |
| Develop-waiting lane | `Functional` | Today's roll is always present, even with no cuts, as the invitation to capture. Every other roll that still lacks a finished reel joins it once it holds at least one cut, newest first. The filter is "not finished" rather than "undeveloped", so a roll left mid-ceremony surfaces here instead of falling between the lane and the shelf. |
| Waiting-roll card | `Functional` | Today's card is amber: cuts against the remaining empty frames, a fill meter against the 12-cut soft target, and 담기 (or 첫 순간 담기 when empty) opening `/capture`. A finished day's card is lumen and reads as ready: 현상하기 pushes `/capture/editing?rollId=`. Tapping either card body opens `/roll/[id]`. Frames render as blurred negatives — nothing in this lane is developed yet. |
| Developed shelf by month | `Functional` | Developed rolls (status `developed` with a persisted reel) are grouped into `현상 완료 · YYYY.MM` sections, newest month and newest roll first. A daily roll is filed by its own day; a roll without a day key is filed by the month it was created. |
| Cover art | `Functional` | Each cover is a four-up mosaic of the reel's first frames, read from the same thumbnail cache the cut grid uses, so no new extraction happens. A roll with fewer than four cuts repeats the frames it has. The roll's tint is a 4px spine down the left edge rather than a full-bleed fill. |
| Empty-day count | `Functional` | Each month section reports how many of its elapsed days hold no cut at all, shown as a dashed `N일 비었음` slot in the cover grid. Elapsed means the whole month for a past month and up to today for the current one; a day with undeveloped cuts counts as collected, not empty. Today's date comes from today's roll rather than the clock, so before that roll exists the count is reported as zero rather than guessed. |
| Cut drawer | `Functional` | A row at the bottom of the cabinet showing the total cut count and, when any exist, how many cuts no roll references. Opens `/cuts`. |
| Empty shelf | `Functional` | With no developed roll yet, the shelf section shows a dashed card pointing at developing today's roll. The waiting lane needs no empty state — today's roll is always in it. |

## Original cut management (`/cuts`)

| Capability | Status | Notes |
| --- | --- | --- |
| Persist completed camera recording | `Functional` | Native temporary media is moved into `document/recordings`. |
| List recordings newest first | `Functional` | Video files are mapped to metadata and sorted by creation or modification time. |
| Grid layout | `Functional` | A three-column grid of cut cells, newest first. Still a grid; the contact-strip rendering with roll-membership dots is the next step. |
| Day-grouped view | `Functional` | A "최신순 / 일자별" toggle switches the grid between one flat newest-first grid and per-day sections; the day heading labels today/yesterday relatively and older days with a full Korean date. |
| First-frame thumbnails | `Functional` | Each grid cell shows the clip's first frame, extracted with `expo-video-thumbnails` and cached under the cache directory by source file name; a film-cell placeholder shows while loading or if extraction fails. |
| Display date and file size | `Functional` | Korean localized date/time formatting comes from `features/manage-recordings`; business-agnostic KB/MB formatting comes from `shared/lib/format-file-size`. Grid cells show only the time of day; the playback modal shows the full date and size. |
| Play a recording | `Functional` | Tapping a cell (outside selection mode) opens a full-screen looping `expo-video` view with native controls. |
| Delete a recording | `Functional` | The capture-record library deletes one clip at a time; the adapter rejects files outside Snaply's recordings directory. Deletion cascades — see [Deleting an original](#deleting-an-original). |
| Select and batch-delete clips | `Functional` | Long-pressing a grid cell enters selection mode and a bottom action bar (취소 · N개 선택 · 전체선택 · 삭제) slides up. The screen is pushed over the tabs, so the bar simply owns the bottom edge — nothing has to be hidden for it. One confirmation deletes all selected clips, committing the ones that succeed even if some fail, and names how many rolls the deletion will also change. Android hardware back exits selection mode; leaving the screen exits it. |
| Refresh after navigation | `Functional` | Both the cabinet and the cut screen reload the recording list whenever they receive focus. |
| Loading, empty, and error states | `Functional` | The screen distinguishes initial loading, no recordings, and list-operation failures. |
| Web persistence | `Prototype` | The web adapter returns an empty list, rejects persistence, and performs no deletion; the web thumbnail adapter returns no thumbnail. |

### Deleting an original

An original exists in four places, and `features/delete-clip` removes it from all four in one action:

```text
1. the video file            shared/lib/recording-files
2. its cached thumbnail      shared/lib/recording-thumbnails   (derived; a failure here never fails the delete)
3. its clip metadata         entities/clip                     (removeClips)
4. every roll that refers    entities/roll                     (removeClipsEverywhere — both clipRefs and a developed reel's clipRefs)
```

Order is deliberate. The file is deleted first because it is the irreversible, failure-prone step: if it fails, nothing else has changed and the clip stays whole. Metadata for everything that did succeed is then committed in one synchronous block, so an interruption cannot leave a clip whose file is gone but whose roll references remain. In a batch, each file is deleted in turn and the metadata of the successful ones is committed together, so a mid-batch failure still commits the rest.

A developed roll's reel is rewritten too. Membership is otherwise frozen once a roll is developed, but a reel that still referenced a deleted original would try to play a file that no longer exists.

This is deliberately distinct from removing a cut from one roll (`removeClipFromRoll`, used by [Roll detail](roll-detail.md)), which drops a reference and leaves the original intact. `features/manage-recordings` owns no deletion path at all — it lists and saves files only — so no caller can delete a file without the cascade.

Both screens that handle originals consume the same two feature slices:

- `pages/capture-record` saves a new recording and browses/selects/deletes originals in a full-screen library modal.
- `pages/cut-strip` reloads, lists, plays, and deletes originals; `pages/archive` reads the list only for its cut counts.

This reuse is why listing (`features/manage-recordings`) and deleting (`features/delete-clip`) are feature slices rather than page-local code.

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

## Ownership

- `src/pages/archive` owns the film cabinet: the develop-waiting lane, the month sections of the developed shelf, and the cut drawer. It holds no cut list of its own.
- `src/pages/archive/ui/pending-roll-card` owns the waiting-roll card in both of its shapes (today / ready to develop); `src/pages/archive/ui/roll-cover` owns the developed cover with its four-up mosaic and tint spine.
- `src/pages/cut-strip` owns the `/cuts` screen: the cut grid, day grouping, playback modal, selection mode, and the delete confirmation. `ui/cut-cell` owns a grid cell and `ui/cut-selection-bar` the bottom action bar.
- `src/widgets/roll-shelf` owns the roll read models — `useRollsAwaitingDevelop` (today + everything still unfinished) and `useDevelopedRollMonths` (developed rolls by month with each month's empty-day count) — plus `formatReelLength`. Both summarize a roll into cover URIs, counts, length, and tint by joining `entities/roll` with `entities/clip`.
- `src/features/delete-clip` owns deleting originals: the file, its thumbnail cache, its clip metadata, and every roll reference to it. Consumed by both the cut screen and the capture-record library.
- `src/widgets/clip-membership` owns the reverse of `roll.clipRefs` — which rolls each clip belongs to (`useClipMembership`, `useRollsForClip`, `selectRollsForClips`), with each roll's stable tint and whether its membership can still be edited. Cross-entity composition shared by clip-side surfaces, so it sits in a widget for the same reason `roll-shelf` does. The cabinet uses it for the drawer's loose-cut count; the cut screen uses it to count the rolls a deletion will affect.
- `src/entities/roll` owns `rollTint(rollId)` (a roll carries no stored color, so its tint is derived from its id and stays the same wherever that roll is drawn; today's roll always uses the reserved ember `TodayRollTint`), the `DailyRollTarget` soft target, and the month helpers `rollMonthKey` / `elapsedDaysInMonth` / `daysInMonth` / `formatMonthKey`.
- `src/features/manage-recordings` owns listing and saving recording files, date/time/day formatting, and the `useRecordingThumbnail` hook. It owns no deletion path — that moved to `features/delete-clip` so no caller can delete a file without the cascade.
- `src/shared/ui/negative-frame` renders an undeveloped cut as a blurred negative; the waiting-roll card's mini strip uses it.
- `src/shared/ui/video-preview` owns the business-agnostic looping video player used by the playback modal.
- `src/shared/lib/recording-files` owns native file operations and the web fallback.
- `src/shared/lib/video-thumbnails` owns first-frame extraction/caching (keyed by base name), the `useVideoThumbnail` hook that resolves one frame for a URI, and the web fallback; `src/shared/lib/recording-thumbnails` is the `LocalRecording` adapter over it.
- `src/entities/capture-session` is not currently connected to persisted recordings; `LocalRecording` contains no mood or duration metadata.

## Known limitations

- The cut screen still lists recording **files** rather than `entities/clip`, so a cut cell cannot show capture mood, requested duration, or tags even though the clip store holds them. The cabinet reads its cut counts from the same file list so the two screens always agree; both move onto the clip store together in the next step.
- A month section appears only when that month holds a developed roll, so a month with cuts but nothing developed shows no empty-day count.
- There is no share/export action, media-library save, cloud backup, or recovery after app deletion.
- Deleting an original (single or batch) is permanent and is not mediated by a trash state.
- The delete confirmation only states *how many* rolls a deletion will change; it does not name them or show the resulting cut counts.
- The delete confirmation uses `Alert.alert`, which is a no-op on react-native-web; this is currently unreachable on web because the web adapter lists no recordings, but a web persistence implementation must also replace the confirmation UI.
