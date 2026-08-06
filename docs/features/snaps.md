# Snap library

## User goal

Users can see every 3–5 second original they have shot, play any of them, pick the ones worth using into the studio's tray, and delete originals they no longer want.

```text
/snaps  (스냅)
├── 오늘 / 어제 / 2026년 7월 20일     day sections, newest first
│   └── 3-column grid, square cells with a length badge and a 담김 badge for tray members
├── tap a cell            → full-screen playback
├── long-press / 선택      → selection mode
└── selection bar         n개 선택 · 트레이 n/10 · 해제 · 삭제 · 트레이에 담기
```

There is no blur and nothing to unlock: the app no longer withholds what was just recorded. Day sections are presentation only — no rule ties a snap to a day any more, the grid simply reads better in date sections.

`/snaps?select=1` opens straight in selection mode; the studio's tray links here that way. It is the only parameter this tab takes: picks made here always go to the tray.

Picking *into a movie* is a screen of its own — `/movie/[id]/add-snaps`, on the root stack — described in [The movie screen](movie.md#composing-and-fixing-it). It draws this tab's grid from the shared `widgets/snap-grid` block, but it is not this tab: until 2026-08-06 it was `/snaps?select=1&for=<movieId>`, which made the movie screen push a *tab* route. Expo Router answers that by mounting a second copy of the tab navigator over the movie, and that navigator — not the root stack — then handled the confirming `router.back()`, switching to its first tab (the studio) instead of returning to the movie the user came from. Adding a cut therefore ended on the 스튜디오 screen.

## Browsing and playback

| Capability | Status | Notes |
| --- | --- | --- |
| Day-grouped grid | `Functional` | Reads `entities/snap`, not the files on disk — the snap store is what carries duration and what movies reference. Grouped by a local `YYYY-MM-DD` key so a day break matches the user's own midnight; sections and snaps are newest-first. Each section prints its count and total length. |
| Cell rendering | `Functional` | Each cell draws the video's first frame through the shared, disk-cached thumbnail util (`shared/ui/video-frame`), not a live player: mounting one `expo-video` player per cell would exhaust the platform's small pool of hardware decoders and leave every cell but the last black. Cells are square: a thumbnail only has to be recognizable, and cropping the 9:16 frame to 9/16 of its height fits nearly twice as many rows on one screen. They are sized in points from the content width rather than shaped with a percentage width plus `aspectRatio`, which collapses a wrapped flex cell whose only children are absolutely positioned. |
| Playback | `Functional` | Tapping a cell opens `shared/ui/video-player-modal` full screen over black, with the snap's length as the edge label. |
| Empty state | `Functional` | With no snaps at all (after the store hydrates), a dashed card points at the center capture button. |

## Selection and 담기

| Capability | Status | Notes |
| --- | --- | --- |
| Enter selection | `Functional` | The header's `선택` control, a long-press on any cell, or arriving with `?select=1`. Android hardware back leaves selection mode instead of leaving the tab. |
| Bottom chrome takeover | `Functional` | While selecting, the screen takes the bottom of the shell over: the tab bar and the capture button step aside through `shared/ui/tab-bar-chrome` and the selection bar has it to itself. Without this the navigator's bar, which paints above every scene, covers the bar's action row and takes the taps meant for `삭제`, `해제`, and `트레이에 담기`. The takeover is derived from selection state and screen focus in one effect, so every way in and out restores the bar — including something navigating to another tab mid-selection, which gives the bar back without discarding the picks. |
| Pick order | `Functional` | Selection is an ordered list, not a set: the number drawn on each cell is its position, and that order becomes the tray order. |
| Cap enforcement | `Functional` | The bar names the target and its room (`트레이 3/10 · 7개 더`). A pick past the remaining room is refused with an inline notice; snaps the target already holds take no new room, so re-picking one is always allowed. The rule itself is `widgets/snap-grid`'s (`useSnapPicking`), so this tab and a movie's picker cannot disagree about it; only the wording of the refusal is the screen's. |
| 트레이에 담기 | `Functional` | Hands the picked ids to `entities/tray` and navigates to the studio, where the tray lives, so the user sees what they collected. If the tray refused any (a concurrent change), the notice reports how many went in and how many were turned away. |
| 담김 badge | `Functional` | A snap the target already holds carries a `담김` badge, in selection mode too — that is exactly when it matters, since picking one does nothing and the user would otherwise only find out afterwards. It sits in the opposite corner from the pick circle. |
| Delete | `Functional` | See below. |

## Deleting an original

An original exists in five places, and `features/delete-snap` removes it from all five in one action:

```text
1. the video file            shared/lib/recording-files
2. its cached thumbnail      shared/lib/video-thumbnails   (derived; a failure here never fails the delete)
3. every movie that refers    entities/movie               (removeSnapsEverywhere)
4. the tray, if it holds it   entities/tray                (removeSnaps)
5. its snap metadata          entities/snap                (removeSnaps)
```

It takes `DeletableSnap` — `{ id, uri }` — rather than a file record, so the snap grid hands it a `Snap` and the capture library a `LocalRecording` without either converting.

Order is deliberate. The file is deleted first because it is the irreversible, failure-prone step: if it fails, nothing else has changed and the snap stays whole. Metadata for everything that did succeed is then committed in one synchronous block, so an interruption cannot leave a snap whose file is gone but whose movie references remain. In a batch, each file is deleted in turn and the metadata of the successful ones is committed together, so a mid-batch failure still commits the rest.

A movie that loses its last cut is kept rather than retired: an empty draft is still the user's, and deleting a movie is a separate deliberate action (a long press on its movie-tab tile — see [Studio and movies](studio.md)).

The confirmation sheet names the damage instead of counting it: every movie that would lose cuts is listed with the count it drops to (`컷 5 → 3`), plus how many of the selected snaps are sitting in the tray. That read model is `pages/snaps/model/use-movie-delete-impact.ts` — cross-entity, but with one consumer, so it stays page-local until a second surface needs it.

On a partial failure the sheet stays open with its error and the snaps that did go are dropped from the selection, so a retry targets only what is left.

`features/manage-recordings` owns no deletion path at all — it lists and saves files only — so no caller can delete a file without the cascade.

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

A snap's id **is** its file name (`create-snap` reuses the recording's id), which is what lets a movie's `snapRefs` and a file on disk address the same thing without a join table. `localRecordingExists(uri)` answers whether the file behind a snap is still there — a synchronous stat, so a caller can decide in the event that opens a sheet.

Thumbnails are derived cover art, held by no model. Extraction and caching live in `shared/lib/video-thumbnails`, which pulls the first frame on first request and caches it under the cache directory keyed by the source file's base name (`<base>.jpg`), exposing `useVideoThumbnail(uri)` for one frame. Because the cache key is the base name, the same file resolves to one thumbnail shared across every surface that previews it (the snap grid, the tray strip, movie covers) whether the caller holds a `Snap` or a `LocalRecording`. Losing the cache only forces re-extraction; it never loses a snap. The web variant returns no thumbnail.

## Data model

```text
Snap
├── id            = the recording's file name
├── uri           local file URI
├── durationSec        the recorded file's real length, in seconds
├── durationMeasured?  true once that length came from the file itself
├── capturedAt    epoch ms
├── place?        { latitude, longitude } — only when a fix was available
└── width, height, orientation
```

`place` is optional permanently, not provisionally: location permission may be
refused, a fix may not arrive inside the capture's short wait, and every snap
captured before the field existed has none. Nothing may treat a missing place as
an error — the template matcher and its 근거 문구 fall back to time alone (see
[Movie templates](movie-templates.md)). Coordinates are all that is stored: there
is no reverse geocoding and no place name, because the only question asked of the
field is whether two snaps are near each other. The value never leaves the device.

`durationSec` is **measured, not assumed** (2026-08-05). It used to store the capture option the snap was shot with (3초 or 5초), but capture is press-and-hold: releasing the finger stops the recording early, so most snaps are shorter than the option they were shot under. Every surface that draws or totals a snap by time was wrong by that difference, and on the movie screen's timeline strip — which draws each cut at its length on a seconds ruler — a 1.2-second snap took three seconds of the ruler. `features/capture-moment` now reads the length back from the persisted file (`shared/lib/video-duration`) and stores that, falling back to the requested length only when the file cannot be read; `durationMeasured` records which of the two it is.

Snaps written before that are corrected in place: `_app/providers/snap-duration-backfill.tsx` walks the library once per app start, **one file at a time** (measuring opens a real video player, and the platform's decoder pool is small), and writes each real length back through `setMeasuredDuration` — the one store action that changes a stored snap, because it records what the snap always was rather than editing it. A file that cannot be read keeps its assumed length and is tried again on a later start.

Snaps are otherwise immutable originals. Per-movie edits (order, trim) live on the movie's `snapRefs`, never here, so the same snap can be cut differently into two movies. `mood` was removed with the redesign — the look belongs to the finished movie, chosen on the movie screen, not to each fragment as it is shot.

## Ownership

- `src/pages/snaps` owns the tab screen: playback, selection mode and its bottom-chrome takeover, the tray commit, the delete-impact read model (`model/use-movie-delete-impact.ts`), and the delete dialog.
- `src/widgets/snap-grid` owns what both picking screens are built from: the day grouping (`model/use-snap-days.ts`), the pick-order and cap rules (`model/use-snap-picking.ts`), the day-sectioned grid and its derived cell width (`ui/snap-day-grid.tsx`), the cell (`ui/snap-cell.tsx`), and the selection bar (`ui/snap-selection-bar.tsx`, whose 삭제 action is optional because a movie's picker does not own deletion). Promoted out of `pages/snaps` on 2026-08-06, when the movie's picker became a screen of its own and a second surface needed the block.
- `src/entities/snap` owns snap metadata, its persisted store (`snaply.snaps`), and the rule for resolving a movie's snap references against it (`snapsByRefs` / `useSnapsByRefs` / `useSnapIndex`, structurally typed so neither snap nor movie imports the other).
- `src/features/delete-snap` owns the cascading deletion across files, thumbnails, movies, the tray, and snap metadata.
- `src/pages/add-snaps` owns the movie's picker screen (`/movie/[id]/add-snaps`), which appends its picks through `features/compose-movie`.
- `src/features/manage-recordings` owns reusable local-recording listing for the capture library.
- `src/shared/ui/video-frame`, `src/shared/ui/video-player-modal`, and `src/shared/lib/datetime` supply the frame, the player chrome, and the day/duration formatting.
- `src/shared/lib/video-duration` reads a local video file's real length (`readVideoDuration`), with a web stub. Transport only: it creates one `expo-video` player, reads the duration, and releases it on every exit path including the timeout.
- `src/_app/providers/snap-duration-backfill.tsx` owns the one-per-start correction of snaps stored before the length was measured. Startup work rather than a feature — nothing about it is an action the user takes.

## Known limitations

- The whole grid renders at once; there is no virtualization, so a very large library scrolls a long list of mounted cells.
- Selection has no "select all" or range selection.
- Snaps are local-only: nothing is uploaded, exported to the media library, or synced between devices.
- Day labels come from `formatDayHeading`, which reads the clock, so "오늘" can go stale if the app is left open past midnight.
