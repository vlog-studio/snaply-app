# Studio and movies

## User goal

The Studio (`/`) is the workbench the app opens on: the snaps picked out for the next movie, the movies still being worked on, and the most recent finished ones. The Movie tab (`/movies`) is the full list of everything made.

```text
/  (스튜디오)
├── 담아둔 스냅       the tray: picked snaps in pick order, n / 10, 약 N초
│                    · 스냅 고르러 가기 / +  → /snaps?select=1
│                    · ✕ per snap, 비우기
│                    · 이 스냅으로 새 무비   → /movie/[id]
├── 템플릿으로 시작    a card per template, each with how far the library gets
│                    through it (4/6컷 있음 · 2컷 더)               → /template/[id]
├── 작업 중           movies with status draft / generating / failed  → /movie/[id]
│                    · a generating movie carries a progress bar
└── 최근 완성         movies with status ready (2 most recent)        → /movie/[id]

/movies  (무비)
└── 2-column tile grid, every movie, most recent edit first          → /movie/[id]
```

Every movie opens on the same screen whatever its status, so no row or tile has to decide where to send it ([The movie screen](movie.md)).

## Two ways to start a movie

The studio offers both, and they answer different questions.

| | The tray | A template |
| --- | --- | --- |
| The question | "make a movie out of *these*" | "make me something like *this*" |
| Who picks the material | the user, one snap at a time | the match, from one outing it found |
| Who arranges it | the user (pick order) | the AI, until the user reorders it |
| What it is good at | a set nobody could have guessed at | telling the user what is missing, and what to go shoot |

They do not consume each other: making a movie from a template leaves the tray exactly as it was. The template half is documented in [Movie templates](movie-templates.md); the rest of this page is the tray and the lanes.

## The tray

The tray is the concept's one invention (concept §5): choosing a snap does not start a movie, it drops the snap in a basket. This is what removes the old "하루 1롤" constraint — material can be gathered across several days and turned into one movie whenever the user wants.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Collect snaps into the tray | `Functional` | Selection mode on the Snap tab adds snaps in pick order (see [Snap library](snaps.md)). The tray persists to a document-directory JSON file (`snaply.tray`), so it survives an app restart. |
| Ten-snap cap | `Functional` | `TrayCapacity` (10) is the app's single hard constraint and matches `MovieSnapLimit`. Adding past it is refused rather than silently truncated: `addSnaps` reports `{ added, rejected }` and the Snap tab tells the user how many were turned away. Snaps already in the tray take no new room. |
| Remove one snap / empty the tray | `Functional` | The ✕ on a tray thumbnail removes one; `비우기` empties it. |
| Empty state | `Functional` | With nothing in it the panel keeps its place and explains what to do, with `스냅 고르러 가기` opening the Snap tab in selection mode. The studio never shows a blank workbench (concept §7). |
| Cascading removal | `Functional` | Deleting a snap original removes it from the tray as well as from every movie (see [Snap library](snaps.md#deleting-an-original)). |
| Start a movie from the tray | `Functional` | `이 스냅으로 새 무비` creates a draft from the whole tray in pick order, empties the tray, and opens [the movie screen](movie.md) on it. The draft is editable there — order, trims, and style are settled before the run. |

## Movie lanes

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 작업 중 lane | `Functional` | Reads `useInProgressMovies()` — every movie whose status is not `ready`, so drafts, in-flight generations, and failures all surface in one place. Each row shows the movie's first cut as a square frame, its cut count and length, its status, and when it was last worked on. |
| 최근 완성 lane | `Functional` | Reads `useReadyMovies()` and previews the two most recent, with `전체 보기` deferring to the movie tab. |
| Movie tab grid | `Functional` | `/movies` draws every movie as a square tile — with its status badge and length — cropped to a square, as in the snap grid, so a second row of movies stays on screen. **The cover is the render's own thumbnail once a run has produced one** (2026-08-10): the grid is cover art, and a finished movie's cover should be the movie rather than the first thing that went into it. A draft, a failed run, a render made before covers were kept, or a cover the OS has reclaimed draws the first cut's frame instead — the fallback is triggered by the image failing to load, not by a check, because a cached file can vanish under the app and only the load says so. Drafts sit in the same grid as finished movies — they are the same object at a different point in its life. |
| Open a movie | `Functional` | Every movie, at every status, opens on [the movie screen](movie.md). Watching a finished one and fixing it are the same visit, so there is nothing for a row or a tile to branch on. |
| Generation progress | `Functional` | A row or tile for a `generating` movie carries a bar from `MovieSummary.progress` — the percentage the backend last published, held on the movie (`movieJobRatio`). Every surface reads the same stored number and none of them ticks: progress moves when a milestone arrives, which is six times over a run (see [The movie screen](movie.md)). |
| Recover a failed movie | `Functional` | A `failed` row or tile carries the stored reason and a `다시 시도` that runs the movie again in place — the board and the grid offer the identical control (`MovieFailureNotice`), because a failure the user can only undo from one of the two places they see it is one they get stuck on. A movie with no cuts left offers no retry; the copy sends them to the movie screen, which is where cuts come back. What can fail and why is in [The movie screen](movie.md). |
| Movie actions: select / share / delete | `Functional` | Acting on movies is selection mode, the same shape as the snap library: a long press on a movie-tab tile enters it with that movie selected, the header's 선택 button is the explicit entry, taps toggle, Android hardware back leaves the mode, and the tab bar gives way to a selection bar (`ui/movie-selection-bar.tsx`). **삭제**, the bar's primary button, works on any number of selected movies: it opens a confirmation sheet (`ui/movie-delete-confirm.tsx`) naming up to three titles and folding the rest into 외 N편; confirming calls `useDeleteMovie` per movie — synchronous store writes, because a movie is only a composition — the snap originals, their thumbnails, and the tray are untouched, and the step says so instead of warning in the abstract. A `generating` movie can be deleted too; the step warns that the job in flight goes with it (the runner stops finding the movie and writes nothing — though the run itself keeps going on the backend and its result is simply never claimed). **공유** is a single-movie act, so it appears in the bar only while exactly one movie is selected — and only while there is a rendered file to hand over, which real runs now produce (2026-08-10): the file is fetched at a fresh address and downloaded to cache before the sheet opens (see [The movie screen](movie.md#sharing)). **Renaming is not a grid act**: it lives on the movie screen, beside the title it edits — an appearing-and-vanishing 이름 바꾸기 in the bar read as inconsistent, and was dropped with the sheet (its planned expansion belongs to the movie screen). Selection mode replaced the long-press actions sheet on 2026-08-07: the sheet's backdrop took the whole grid away exactly when the user was comparing movies to decide which ones to act on, and it could only ever delete one movie per visit. The grid is the bulk entry: board rows offer no long-press actions. A `ready` movie can also be deleted one at a time from its own screen — watch mode's ⋯ sheet carries 무비 삭제하기 with the same reassurance (see [The movie screen](movie.md)). |

## Data model

`entities/movie` replaces the old roll/reel pair: a roll owned membership and a reel was the developed result, but a movie owns both, because the user edits and generates the same object.

```text
Movie
├── id, title
├── status        draft | generating | ready | failed
├── createdAt, updatedAt
├── snapRefs[]    { snapId, order, trim? }   — per-movie order and trim; the snap original is never mutated
├── style         emotional | travel | daily — the backend's three editing presets
├── bgm, ratio    track id, '9:16'
├── arranger?     user | ai — who owns the cut order (see the movie screen)
├── captions      stored but unused — the backend subtitles every run and offers no switch
├── job?          { id, progress?, step?, startedAt } — the backend's jobId and its last report
├── render?       { uri?, renderedAt, durationSec }
└── error?        why the last generation failed
```

`failed` is a first-class status rather than a flavor of draft: generation really does fail, and the user has to be able to tell "I have not run this yet" from "it broke". A failed movie keeps its cut list and settings so a retry starts from what the user already chose, and keeps its `error` so the board can say what went wrong; `MovieSummary` reports the error only while the movie is still failed, so a retried movie stops advertising a problem it is no longer in.

A job lives on the movie rather than in memory so it outlives the screen that started it and the session it started in — the user is expected to leave while a movie generates. Since 2026-08-07 the `id` is the **backend's** `jobId`: it is the only handle on the run, so the progress socket and the status endpoint are both addressed by it, and a movie that lost it could never find out what happened. `progress` and `step` are optional because a job stored by an older build has neither; read progress through `movieJobRatio` rather than directly.

The store exposes reads (`useMovies`, `useMovieById`, `getMovieById`, `useMoviesHydrated`), the writes the movie screen needs (`useCreateMovie`, `useUpdateMovieCuts`, `useUpdateMovieStyle`, `useSetMovieArranger`, `useRenameMovie`, `useDeleteMovie`), the four generation-lifecycle actions (`useBeginMovieJob`, `useAdvanceMovieJob`, `useFinishMovieJob`, `useFailMovieJob`), and `useRemoveSnapsEverywhere` for the delete cascade. `useDeleteMovie` is called from two places: the delete confirmation of the movie tab's selection mode, and the movie screen's ⋯ sheet (watch mode).

Two of these are deliberately identity-preserving: a write that changes nothing returns the state object unchanged. The generation runner writes what each poll and each socket frame reports, and a new `movies` array on every one of those would re-render every movie surface for a report that said nothing new. `advanceMovieJob` also refuses to move progress backwards — the socket sends a snapshot when it connects, so a reconnect mid-run would otherwise rewind the ring.

## Ownership

- `src/pages/studio` owns the screen, the tray panel (`ui/tray-panel.tsx`), the template cards (`ui/template-panel.tsx`), and the navigation into snap selection, a template, and a movie.
- `src/pages/movies` owns the movie tab's grid and its selection mode — the bottom bar (`ui/movie-selection-bar.tsx`) and the delete confirmation (`ui/movie-delete-confirm.tsx`) — page-local because the grid is the actions' only entry point. Share is not its own: the page goes through `features/share-movie`'s export decision.
- `src/features/compose-movie` owns starting a movie from the tray or a template, committing cut lists and style settings, the arrangement rules, starting generation, and the app-wide generation runner (see [The movie screen](movie.md)).
- `src/entities/tray` owns the tray store: pick order, the ten-snap cap, and the `{ added, rejected }` outcome. It holds ids only and never imports `entities/snap` — resolving a tray entry to a snap is the studio's join, through `useSnapsByRefs`.
- `src/entities/movie` owns movies and their persisted store (`snaply.movies`). It never imports `entities/snap`; `SnapRef` is matched structurally by `entities/snap`'s `SnapRefLike`.
- `src/widgets/movie-shelf` owns the movie↔snap read model (`MovieSummary`: cut count, total played seconds, cover frames, the render's own cover image when it has one, date label, job progress, failure reason), the two lane selectors, and the two ways a movie is drawn — `MovieRow` for the board and `MovieTile` for the grid, sharing one status badge and one failure notice. Only the tile prefers the render's cover image (`shared/ui/image-frame`): a board row is a work list, where the movie's own first cut says more about the work than finished cover art. It is a widget because both the studio and the movie tab need the same summary and the same vocabulary, and neither entity may own a cross-entity join. The failure notice is the one card part that acts rather than draws: it calls `compose-movie`'s `startGeneration` itself, so the retry cannot drift between the two surfaces.
- `src/shared/ui/video-frame` draws a video's first frame from the shared thumbnail cache. Business-agnostic — it takes a URI, not a `Snap`.

## Known limitations

- Generation is a local simulation and nothing is composited (see [The movie screen](movie.md)). A `ready` movie is real state, but its "render" is a length and a timestamp.
- Selection mode is reachable from the movie tab alone: a board row answers a long press with nothing, so a movie made by mistake still has to be found in the grid to be removed. (Renaming is not offered here at all — it lives on the movie screen.)
- The tray is single. Collecting for two movies at once is not possible (concept §11 leaves this open).
- `MovieSummary.dateLabel` reads the clock through `formatDayHeading`, so a movie edited just before midnight keeps reading "오늘" until the screen re-renders.
- Movies are local-only. There is no upload, no server-side composition, and no sync between devices.
