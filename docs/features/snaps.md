# Snap library

## User goal

Users can see every original in their library — shot in the app (up to the 3s/5s capture ceiling) or extracted out of a gallery video (0.5–5s, see [Snap extraction](snap-extract.md)) — play any of them, pick the ones worth using into the studio's tray, and delete originals they no longer want.

```text
/snaps  (스냅)
├── header                스냅 · 선택          (the mode switch, alone on the right)
│   └── N개 · m:ss · 트레이 n/10               what the library holds; the chip only once the tray does
├── 오늘 / 어제 / 2026년 7월 20일     day sections, newest first
│   ├── leading 가져오기 cell          heads the newest day (→ system picker → /extract)
│   └── 3-column grid, square cells with a length badge, a 담김 badge for tray members,
│       and an upload badge while a snap is transferring or failed
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
| Header | `Functional` | The right side carries one control — `선택` / `취소` — so entering selection no longer slides that control sideways under the finger, which it did while `가져오기` shared the row. Below the title sits state, not spec: `N개 · m:ss` (the library's count and total length, `useSnapDays`) and, once the tray holds anything, a `트레이 n/10` chip. The chip answers before the user starts picking the question the selection bar used to answer only after. The old subtitle `N개 · 최대 5초 원본` was dropped: the length ceiling is enforced by the extraction trimmer, not by a line of copy. |
| Empty state | `Functional` | No card and no separate button: after the store hydrates, an empty library is the `가져오기` cell standing alone in the grid, with the header reading `0개 · 0:00`. The other way in is the shell's capture button. |
| 가져오기 | `Functional` | A dashed cell at the head of the newest day's row (`widgets/snap-grid/ui/snap-import-cell.tsx`) rather than a header action — it sits where the snaps it produces will land, and it is the same control whether the library is empty or full. It opens the system video picker and hands the choice to `/extract`; the flow itself is [Snap extraction](snap-extract.md). Absent while selecting (a tap means picking then) and until the store hydrates. A picker failure shows a dismissible notice. |

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

An original exists in six places, and `features/delete-snap` removes it from all six in one action:

```text
1. the video file            shared/lib/recording-files
2. its cached thumbnail      shared/lib/video-thumbnails   (derived; a failure here never fails the delete)
3. every movie that refers    entities/movie               (removeSnapsEverywhere)
4. the tray, if it holds it   entities/tray                (removeSnaps)
5. its snap metadata          entities/snap                (removeSnaps)
6. its sync state             entities/snap                (forgetSnaps — an uploaded snap leaves a delete tombstone)
```

The remote copy is the sixth place's indirection rather than a seventh step: retiring an uploaded snap's sync entry leaves its `videoId` as a tombstone, and the upload worker (see below) owes the server that `DELETE /videos/{id}` — so a local delete never waits on the network and an offline delete still propagates later.

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

Recordings are app-private local files. They are not entries in the device media library. App deletion removes them. The local file stays the source of truth for every screen; the backend upload described below is a copy that trails behind it, never a precondition.

A snap's id **is** its file name (`create-snap` reuses the recording's id), which is what lets a movie's `snapRefs` and a file on disk address the same thing without a join table. `localRecordingExists(uri)` answers whether the file behind a snap is still there — a synchronous stat, so a caller can decide in the event that opens a sheet.

Thumbnails are derived cover art, held by no model. Extraction and caching live in `shared/lib/video-thumbnails`, which pulls the first frame on first request and caches it under the cache directory keyed by the source file's base name (`<base>.jpg`; a frame requested at an explicit offset — the extraction screen's filmstrip — is keyed `<base>@<ms>.jpg`), exposing `useVideoThumbnail(uri)` for one frame. Because the cache key is the base name, the same file resolves to one thumbnail shared across every surface that previews it (the snap grid, the tray strip, movie covers) whether the caller holds a `Snap` or a `LocalRecording`. Losing the cache only forces re-extraction; it never loses a snap. The web variant returns no thumbnail.

## Backend upload sync (2026-08-07)

Every snap is uploaded to the backend automatically, so that by the time movie generation moves server-side (`POST /edit-jobs` takes `videoIds`), the material is already there and the user never waits on a bulk upload at the moment they ask for a movie.

| Capability | Status | Notes |
| --- | --- | --- |
| Upload worker | `Functional` | `features/upload-snap`, mounted app-wide as `SnapUploadGate` in `_app/providers` — an upload continues wherever the user navigates, like movie generation. Runs only while authenticated (the endpoints tie videos to the caller) and after both snap stores hydrate. Strictly serial: one transfer at a time, oldest capture first. Routes to in-code mocks under `USE_MOCK_API`, like every other API caller. |
| Pipeline per snap | `Functional` | The backend's three steps: `GET /videos/upload-url` (presign) → PUT the bytes to the presigned URL (`expo/fetch` with the `expo-file-system` `File` as body — no auth header, no envelope, so it bypasses `apiRequest`) → `POST /videos` (register ready, integer `durationSeconds`). The `Content-Type` is derived once from the file extension and used for both the presign query and the PUT header, which S3-style storage requires to match. |
| Derived queue | `Functional` | The queue is never stored: a snap with no sync entry **is** pending. New captures, a signed-out backlog that waits for sign-in, and transfers the app died inside (uploading entries are not persisted, so they rehydrate as pending) all become the same thing — pending snaps the worker finds on its next trigger. Triggers: a snap or tombstone appearing, a manual retry, sign-in, and the app returning to the foreground. |
| Retry and backoff | `Functional` | A failed step marks the snap `failed` and backs off in-memory (5s → 30s → 2m). After 5 recorded attempts the snap waits for a manual retry. The attempt count persists; the backoff does not — a restart retries immediately. |
| Sync badges | `Functional` | The grid cell shows `업로드 중` during an actual transfer and `업로드 실패` (danger fill) on failure. `uploaded` and `pending` are silent on purpose: success everywhere is noise, and pending is every snap's resting state whenever the worker cannot run (signed out, offline) — a permanent "업로드 중" would be a lie. |
| Failed banner | `Functional` | The snaps tab shows `스냅 N개를 업로드하지 못했어요 · 다시 시도` when any snap is failed; retry clears the failed entries, which requeues them. |
| Delete propagation | `Functional` | Tombstoned `videoId`s are drained with `DELETE /videos/{id}` at the start of every worker pass; a refused delete stays owed and is retried on the next trigger. A snap deleted mid-upload after its row was registered ready leaves a tombstone too; one deleted before registration leaves the never-ready row to the backend's GC. |

Sync state lives in `entities/snap/model/snap-sync-store.ts` (persisted as `snaply.snap-sync`), separate from the snap store because a snap is an immutable original and its sync progress is not part of what it is — and because `upload-snap`, `delete-snap`, and (later) movie creation must meet at an entity, features being unable to import each other.

```text
SnapSyncEntry (per snap id; absence = pending)
├── uploading                    not persisted — rehydrates as pending
├── uploaded { videoId }         the snap's remote identity
└── failed { attempts }
deleteTombstones: videoId[]      remote deletes still owed
```

The presign response shape is spec-confirmed since the 2026-08-07 spec update (`{ videoId, uploadUrl, s3Key }`); the Zod contract validates the two fields the app consumes. Live-verified on the physical Android device against the real backend (2026-08-07): a 16-snap backlog uploaded end-to-end (`video/mp4` accepted, every entry earning a UUID `videoId`), an infrastructure outage marked snaps failed and a later trigger recovered all of them, an airplane-mode capture surfaced the failed badge/banner and recovered, and three deletions drained their tombstones (the worker clears one only when the server confirms the DELETE). One caveat: the presigned URL's host must be reachable *from the device* — the storage endpoint the backend signs into the URL cannot be its own `localhost`.

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

`width`/`height`/`orientation` are real on **extracted** snaps (read back from the trimmed file, rotation applied — a gallery video is as often landscape or square as portrait) and a portrait stand-in (1080×1920) on **captured** snaps, whose real detection remains a TODO in `features/capture-moment/model/create-snap.ts`. Extracted snaps carry no `place` — where a gallery video was shot is unknown, and where the user stands now is not it.

Snaps are otherwise immutable originals. Per-movie edits (order, trim) live on the movie's `snapRefs`, never here, so the same snap can be cut differently into two movies. `mood` was removed with the redesign — the look belongs to the finished movie, chosen on the movie screen, not to each fragment as it is shot.

## Ownership

- `src/pages/snaps` owns the tab screen: playback, selection mode and its bottom-chrome takeover, the tray commit, the delete-impact read model (`model/use-movie-delete-impact.ts`), the delete dialog, and the 가져오기 entry into [Snap extraction](snap-extract.md).
- `src/widgets/snap-grid` owns what both picking screens are built from: the day grouping and the library totals (`model/use-snap-days.ts`), the pick-order and cap rules (`model/use-snap-picking.ts`), the day-sectioned grid and its derived cell width (`ui/snap-day-grid.tsx`), the cell (`ui/snap-cell.tsx`), the leading import cell (`ui/snap-import-cell.tsx`, drawn only for a screen that passes `onImport` — a movie's picker does not), and the selection bar (`ui/snap-selection-bar.tsx`, whose 삭제 action is optional because a movie's picker does not own deletion). Promoted out of `pages/snaps` on 2026-08-06, when the movie's picker became a screen of its own and a second surface needed the block.
- `src/entities/snap` owns snap metadata, its persisted store (`snaply.snaps`), the sync-state store (`snaply.snap-sync` — upload status, `videoId` mapping, delete tombstones), and the rule for resolving a movie's snap references against it (`snapsByRefs` / `useSnapsByRefs` / `useSnapIndex`, structurally typed so neither snap nor movie imports the other).
- `src/features/upload-snap` owns the upload worker (`SnapUploadGate`, mounted in `_app/providers`), the three transfer steps against `/videos`, the tombstone drain against `DELETE /videos/{id}`, and the retry/backoff policy.
- `src/features/delete-snap` owns the cascading deletion across files, thumbnails, movies, the tray, snap metadata, and sync state.
- `src/pages/add-snaps` owns the movie's picker screen (`/movie/[id]/add-snaps`), which appends its picks through `features/compose-movie`.
- `src/features/manage-recordings` owns reusable local-recording listing for the capture library.
- `src/shared/ui/video-frame`, `src/shared/ui/video-player-modal`, and `src/shared/lib/datetime` supply the frame, the player chrome, and the day/duration formatting.
- `src/shared/lib/video-duration` reads a local video file's real length (`readVideoDuration`), with a web stub. Transport only: it creates one `expo-video` player, reads the duration, and releases it on every exit path including the timeout.
- `src/_app/providers/snap-duration-backfill.tsx` owns the one-per-start correction of snaps stored before the length was measured. Startup work rather than a feature — nothing about it is an action the user takes.

## Known limitations

- The whole grid renders at once; there is no virtualization, so a very large library scrolls a long list of mounted cells.
- Selection has no "select all" or range selection.
- Live verification (2026-08-07) covered upload, failure/retry, and delete propagation on the physical Android device; crash recovery mid-transfer (an `uploading` entry rehydrating as pending) is guarded by the store's unit-tested partialize contract but was not reproducible on device — real transfers finish too fast to kill the app inside one. Any backend file-size limit remains unverified, and nothing has run on iOS hardware.
- Only the file and its rounded length are uploaded. `capturedAt`, `place`, and dimensions stay local, so the server's video list cannot yet rebuild the library (reinstall, second device) — that phase needs backend metadata fields first, and until then snaps are not synced between devices or exported to the media library.
- Transfers are foreground-only: backgrounding mid-upload fails the attempt, which is retried on the next foreground return. There is no Wi-Fi-only setting; uploads use whatever network is available.
- A snap deleted mid-upload before its row is registered leaves a never-ready row on the server; the client does not clean those, by design — they are the backend GC's.
- Day labels come from `formatDayHeading`, which reads the clock, so "오늘" can go stale if the app is left open past midnight.
