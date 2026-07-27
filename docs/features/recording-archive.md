# Recording archive

## User goal

Users can see which rolls are still waiting to be developed, browse the rolls they have developed, and manage the original cuts behind them.

The Archive is the **film cabinet** (`/archive`): one scroll reading anticipation → what you own → raw material. The 컷/롤 segmented control is gone; the cuts moved behind a drawer at the bottom of the cabinet that opens the pushed `/cuts` screen, which draws them as a **contact strip**. Both screens keep the darkroom visual language (edge prints, film-black tiles, blurred negatives for anything undeveloped).

```text
/archive  (film cabinet)
├── 현상 대기        today's roll + every roll still holding an undeveloped reel
├── 현상 완료 · YYYY.MM   developed rolls by month, plus that month's empty-day count
└── 모든 컷 ›        drawer → /cuts

/cuts     (every original cut, as a contact strip)
├── 필터            전체 · 미현상 · 롤 없음 N · 롤별 ▾
├── 일자 스트립      one horizontal 35mm strip per day; roll tint dots under each frame
├── 컷 시트          tap a frame → its metadata, the rolls holding it, play, delete
└── 선택 모드        long-press or 선택 → batch delete
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

The screen reads `entities/clip`, not the recording files on disk. The clip store is what rolls reference and what carries duration, mood, and orientation; the file list could only ever answer "what is on disk". The cabinet's drawer counts the same clips, so the number on the drawer is the number of frames behind it.

| Capability | Status | Notes |
| --- | --- | --- |
| Persist completed camera recording | `Functional` | Native temporary media is moved into `document/recordings`; the capture flow then writes the clip metadata that this screen lists. |
| Contact strip by day | `Functional` | One horizontal 35mm strip per capture day, newest day and newest cut first, each scrolling on its own axis so a heavy day never disturbs the vertical rhythm. Frames sit between sprocket-hole rows drawn at a fixed pitch. Days are keyed by `toDayKey` — the daily roll's own key — so a strip and the roll that collected it always line up; the heading labels today/yesterday relatively and older days with a full Korean date. |
| Roll membership dots | `Functional` | Under each frame, one dot per roll holding that cut in that roll's tint (up to three, then `+N`), so N:M is legible without opening anything. A cut no roll holds gets an amber dashed edge instead. |
| Day status | `Functional` | Each strip's heading reports where its day stands: `담는 중` (today), `현상 준비됨`, or the day's total length once a developed roll holds any of its cuts. Read from the whole day, so a filter that hides the developed cuts never restates the day's status. |
| Today's empty frames | `Functional` | Today's strip is padded with `?` frames up to the 12-cut soft target — the invitation to keep collecting (concept §4). Only today, and only on the unfiltered strip: a past day's unfilled frames are not an invitation, and a filtered day is a subset of itself. |
| Filters | `Functional` | `전체` · `미현상` · `롤 없음 N` · `롤별 ▾`. `미현상` means "no reel has been made of it", which includes cuts no roll holds at all. `롤별` opens a sheet listing every roll that holds a cut, today's first, with each roll's tint and cut count; a roll holding nothing is left out. |
| Cut sheet | `Functional` | Tapping a frame opens a bottom sheet: its edge print (cut number, duration, orientation, capture mood), its capture date, and every roll holding it with that roll's status. A developed roll's row is marked `멤버십 고정` — its reel is a finished artifact, the same rule roll detail enforces. A cut in no roll says so. Actions are 재생 and 보관함에서 삭제. |
| First-frame thumbnails | `Functional` | Each frame shows the clip's first frame, extracted with `expo-video-thumbnails` and cached under the cache directory by source file name; the film-black gate shows while loading or if extraction fails. |
| Play a cut | `Functional` | 재생 in the cut sheet opens a full-screen looping `expo-video` view with native controls, captioned with the capture date and length. |
| Missing original | `Functional` | Clip metadata can outlive its file (a delete removes the file before committing the store write). The sheet checks the file when it opens and, when it is gone, disables 재생 and says so rather than handing a missing URI to the player. |
| Delete a cut | `Functional` | From the cut sheet or the selection bar; the capture-record library deletes one clip at a time. The adapter rejects files outside Snaply's recordings directory. Deletion cascades — see [Deleting an original](#deleting-an-original). |
| Select and batch-delete clips | `Functional` | Long-pressing a frame or pressing 선택 enters selection mode and a bottom action bar (취소 · N개 선택 · 전체선택 · 삭제) slides up. The screen is pushed over the tabs, so the bar simply owns the bottom edge. 전체선택 covers what the filter is showing, not the whole archive. One confirmation deletes all selected clips, committing the ones that succeed even if some fail, and names how many rolls the deletion will also change. Android hardware back exits selection mode; leaving the screen exits it. |
| Loading, empty, and error states | `Functional` | Before the clip store hydrates, a loading line; with no cuts at all, a dashed card pointing at `/capture`; with cuts but none matching the filter, `이 필터에 해당하는 컷이 없어요` and a 필터 해제 link. Delete failures surface as a card at the top. The list needs no focus refresh — the clip store is reactive. |
| Web persistence | `Prototype` | The web adapter persists no files and reports none as existing; the web thumbnail adapter returns no thumbnail. The clip store itself is platform-neutral, so a web build shows metadata with no frames and no playback. |

### Deleting an original

An original exists in four places, and `features/delete-clip` removes it from all four in one action:

```text
1. the video file            shared/lib/recording-files
2. its cached thumbnail      shared/lib/video-thumbnails   (derived; a failure here never fails the delete)
3. its clip metadata         entities/clip                 (removeClips)
4. every roll that refers    entities/roll                 (removeClipsEverywhere — both clipRefs and a developed reel's clipRefs)
```

It takes `DeletableClip` — `{ id, uri }` — rather than a file record, so the cut strip hands it a `Clip` and the capture library a `LocalRecording` without either converting.

Order is deliberate. The file is deleted first because it is the irreversible, failure-prone step: if it fails, nothing else has changed and the clip stays whole. Metadata for everything that did succeed is then committed in one synchronous block, so an interruption cannot leave a clip whose file is gone but whose roll references remain. In a batch, each file is deleted in turn and the metadata of the successful ones is committed together, so a mid-batch failure still commits the rest.

A developed roll's reel is rewritten too. Membership is otherwise frozen once a roll is developed, but a reel that still referenced a deleted original would try to play a file that no longer exists.

This is deliberately distinct from removing a cut from one roll (`removeClipFromRoll`, used by [Roll detail](roll-detail.md)), which drops a reference and leaves the original intact. `features/manage-recordings` owns no deletion path at all — it lists and saves files only — so no caller can delete a file without the cascade.

Both screens that handle originals consume the same two feature slices:

- `pages/capture-record` saves a new recording and browses/selects/deletes originals in a full-screen library modal. It is the one surface still working in files, because it is the surface that produces them.
- `pages/cut-strip` lists, plays, and deletes clips; `pages/archive` reads the clip store only for its cut counts.

This reuse is why saving (`features/manage-recordings`) and deleting (`features/delete-clip`) are feature slices rather than page-local code.

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

A clip's id **is** its file name (`create-clip` reuses the recording's id), which is what lets a roll's `clipRefs` and a file on disk address the same thing without a join table. `localRecordingExists(uri)` answers whether the file behind a clip is still there — a synchronous stat, so a caller can decide in the event that opens a sheet.

Thumbnails are derived cover art, held by no model. The extraction and caching live in the generic `shared/lib/video-thumbnails` util, which pulls the first frame on first request and caches it under the cache directory keyed by the source file's base name (`<base>.jpg`), and exposes `useVideoThumbnail(uri)` for one frame. Because the cache key is the base name, the same file resolves to one thumbnail shared across every surface that previews it (the contact strip, roll covers, Home's strip, and roll-detail negatives) whether the caller holds a `Clip` or a `LocalRecording`. Losing the cache only forces re-extraction; it never loses a clip. The web variant returns no thumbnail.

## Ownership

- `src/pages/archive` owns the film cabinet: the develop-waiting lane, the month sections of the developed shelf, and the cut drawer. It holds no cut list of its own.
- `src/pages/archive/ui/pending-roll-card` owns the waiting-roll card in both of its shapes (today / ready to develop); `src/pages/archive/ui/roll-cover` owns the developed cover with its four-up mosaic and tint spine.
- `src/pages/cut-strip` owns the `/cuts` screen. `model/use-cut-strip` is its read model: it joins `entities/clip` with `widgets/clip-membership`, applies the filter, groups cuts into days, and derives each day's status and today's open frames (`useCutRollFilters` supplies the roll picker's options). `ui/cut-film-strip` owns one day's strip and its perforation, `ui/cut-frame` a single frame with its roll dots, `ui/cut-filter-bar` the filter chips, `ui/cut-roll-picker-sheet` the roll picker, `ui/cut-sheet` the per-cut sheet, and `ui/cut-selection-bar` the bottom action bar.
- `src/widgets/roll-shelf` owns the roll read models — `useRollsAwaitingDevelop` (today + everything still unfinished) and `useDevelopedRollMonths` (developed rolls by month with each month's empty-day count) — plus `formatReelLength`. Both summarize a roll into cover URIs, counts, length, and tint by joining `entities/roll` with `entities/clip`.
- `src/features/delete-clip` owns deleting originals: the file, its thumbnail cache, its clip metadata, and every roll reference to it. Consumed by both the cut screen and the capture-record library.
- `src/widgets/clip-membership` owns the reverse of `roll.clipRefs` — which rolls each clip belongs to (`useClipMembership`, `useRollsForClip`, `selectRollsForClips`), with each roll's stable tint and whether its membership can still be edited. Cross-entity composition shared by clip-side surfaces, so it sits in a widget for the same reason `roll-shelf` does. The cabinet uses it for the drawer's loose-cut count; the strip uses it for its frame dots, its filters, the cut sheet's roll list, and the rolls a deletion will affect.
- `src/entities/roll` owns `rollTint(rollId)` (a roll carries no stored color, so its tint is derived from its id and stays the same wherever that roll is drawn; today's roll always uses the reserved ember `TodayRollTint`), the `DailyRollTarget` soft target, `toDayKey` (the day key the strip groups by), and the month helpers `rollMonthKey` / `elapsedDaysInMonth` / `daysInMonth` / `formatMonthKey`.
- `src/entities/clip` owns the archive of cuts and their metadata — duration, capture mood, orientation, tags — and is what both the strip and the cabinet's counts read.
- `src/features/manage-recordings` owns listing and saving recording files and Korean date/time/day formatting. It owns no deletion path — that moved to `features/delete-clip` so no caller can delete a file without the cascade.
- `src/shared/ui/negative-frame` renders an undeveloped cut as a blurred negative; the waiting-roll card's mini strip uses it. The contact strip shows its frames unblurred — these are the originals, not a roll's withheld reel.
- `src/shared/ui/video-preview` owns the business-agnostic looping video player used by the playback modal; `src/shared/ui/bottom-sheet` backs the cut sheet and the roll picker.
- `src/shared/lib/recording-files` owns native file operations — list, persist, delete, exists — and the web fallback.
- `src/shared/lib/video-thumbnails` owns first-frame extraction/caching (keyed by base name), the `useVideoThumbnail` hook that resolves one frame for a URI, and the web fallback.

## Known limitations

- The strip reads and deletes only. The collecting actions the design puts on the selection bar — 새 롤로 묶기, 롤에 담기, 롤에서 빼기 — and the cut sheet's 빼기 are not built yet, so the bar is still 취소 · N개 선택 · 전체선택 · 삭제 in every filter context, including 롤별. The sheet states a developed roll's frozen membership rather than disabling a 빼기 button, because a control with no behavior behind it is not built.
- Because the list is the clip store, a cut whose file was lost outside the app still appears, with no thumbnail; only the cut sheet says the original is missing.
- A day with cuts but no roll at all reports `현상 준비됨`, which overstates it slightly — nothing can be developed until the cuts are in a roll.
- A month section appears only when that month holds a developed roll, so a month with cuts but nothing developed shows no empty-day count.
- There is no share/export action, media-library save, cloud backup, or recovery after app deletion.
- Deleting an original (single or batch) is permanent and is not mediated by a trash state.
- The delete confirmation only states *how many* rolls a deletion will change; it does not name them or show the resulting cut counts.
- The delete confirmation uses `Alert.alert`, which is a no-op on react-native-web; this is currently unreachable on web because the web adapter lists no recordings, but a web persistence implementation must also replace the confirmation UI.
