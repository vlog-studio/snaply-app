# Studio and movies

## User goal

The Studio (`/`) is the workbench the app opens on: the snaps picked out for the next movie, the movies still being worked on, and the most recent finished ones. The Movie tab (`/movies`) is the full list of everything made.

```text
/  (스튜디오)
├── 담아둔 스냅       the tray: picked snaps in pick order, n / 10, 약 N초
│                    · 스냅 고르러 가기 / +  → /snaps?select=1
│                    · ✕ per snap, 비우기
│                    · 이 스냅으로 새 무비   → /movie/[id]
├── 작업 중           movies with status draft / generating / failed  → /movie/[id]
│                    · a generating movie carries a progress bar
└── 최근 완성         movies with status ready (2 most recent)        → /movie/[id]/play

/movies  (무비)
└── 2-column tile grid, every movie, most recent edit first
    ├── draft / generating / failed                                  → /movie/[id]
    └── ready                                                        → /movie/[id]/play
```

## The tray

The tray is the concept's one invention (concept §5): choosing a snap does not start a movie, it drops the snap in a basket. This is what removes the old "하루 1롤" constraint — material can be gathered across several days and turned into one movie whenever the user wants.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Collect snaps into the tray | `Functional` | Selection mode on the Snap tab adds snaps in pick order (see [Snap library](snaps.md)). The tray persists to a document-directory JSON file (`snaply.tray`), so it survives an app restart. |
| Ten-snap cap | `Functional` | `TrayCapacity` (10) is the app's single hard constraint and matches `MovieSnapLimit`. Adding past it is refused rather than silently truncated: `addSnaps` reports `{ added, rejected }` and the Snap tab tells the user how many were turned away. Snaps already in the tray take no new room. |
| Remove one snap / empty the tray | `Functional` | The ✕ on a tray thumbnail removes one; `비우기` empties it. |
| Empty state | `Functional` | With nothing in it the panel keeps its place and explains what to do, with `스냅 고르러 가기` opening the Snap tab in selection mode. The studio never shows a blank workbench (concept §7). |
| Cascading removal | `Functional` | Deleting a snap original removes it from the tray as well as from every movie (see [Snap library](snaps.md#deleting-an-original)). |
| Start a movie from the tray | `Functional` | `이 스냅으로 새 무비` creates a draft from the whole tray in pick order, empties the tray, and opens the editor on it (see [Movie editor](movie-editor.md)). |

## Movie lanes

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 작업 중 lane | `Functional` | Reads `useInProgressMovies()` — every movie whose status is not `ready`, so drafts, in-flight generations, and failures all surface in one place. Each row shows a stack of the movie's first cuts, its cut count and length, its status, and when it was last worked on. |
| 최근 완성 lane | `Functional` | Reads `useReadyMovies()` and previews the two most recent, with `전체 보기` deferring to the movie tab. |
| Movie tab grid | `Functional` | `/movies` draws every movie as a 9:16 tile with its status badge and length. Drafts sit in the same grid as finished movies — they are the same object at a different point in its life. |
| Open a movie | `Functional` | A finished movie opens on [playback](movie-playback.md); anything unfinished opens on the [editor](movie-editor.md). The tile's action is whatever the movie is waiting for. |
| Generation progress | `Functional` | A row or tile for a `generating` movie carries a bar from `MovieSummary.progress`, derived from the step the job has reached. A card is deliberately coarse — a list must not re-render on a timer, so the second-by-second number lives on the generation step alone (see [Movie editor](movie-editor.md)). |
| Recover a failed movie | `Functional` | A `failed` row or tile carries the stored reason and a `다시 시도` that runs the movie again in place — the board and the grid offer the identical control (`MovieFailureNotice`), because a failure the user can only undo from one of the two places they see it is one they get stuck on. A movie with no cuts left offers no retry; the copy sends them to the editor, which is where cuts come back. What can fail and why is in [Movie editor](movie-editor.md). |

## Data model

`entities/movie` replaces the old roll/reel pair: a roll owned membership and a reel was the developed result, but a movie owns both, because the user edits and generates the same object.

```text
Movie
├── id, title
├── status        draft | generating | ready | failed
├── createdAt, updatedAt
├── snapRefs[]    { snapId, order, trim? }   — per-movie order and trim; the snap original is never mutated
├── style         calm | upbeat | plain | emotional
├── bgm, ratio    track id, '9:16'
├── captions      whether generation should burn in automatic subtitles
├── job?          { id, stepIndex, startedAt } while a generation job is in flight
├── render?       { uri?, renderedAt, durationSec }
└── error?        why the last generation failed
```

`failed` is a first-class status rather than a flavor of draft: generation really does fail, and the user has to be able to tell "I have not run this yet" from "it broke". A failed movie keeps its cut list and settings so a retry starts from what the user already chose, and keeps its `error` so the board can say what went wrong; `MovieSummary` reports the error only while the movie is still failed, so a retried movie stops advertising a problem it is no longer in.

A job lives on the movie rather than in memory so it outlives the screen that started it and the session it started in — the user is expected to leave while a movie generates. `stepIndex` is the only progress the store keeps; anything finer is derived from `startedAt` by whoever needs it.

The store exposes reads (`useMovies`, `useMovieById`, `getMovieById`, `useMoviesHydrated`), the writes the editor needs (`useCreateMovie`, `useUpdateMovieCuts`, `useUpdateMovieStyle`, `useRenameMovie`, `useDeleteMovie`), the four generation-lifecycle actions (`useBeginMovieJob`, `useAdvanceMovieJob`, `useFinishMovieJob`, `useFailMovieJob`), and `useRemoveSnapsEverywhere` for the delete cascade. `useDeleteMovie` is the one action with no caller — there is no movie-deletion UI yet (concept §11 leaves where it belongs open).

Two of these are deliberately identity-preserving: a write that changes nothing returns the state object unchanged. The generation runner re-checks every job on a timer and writes the step it finds, and a new `movies` array on each of those would re-render every movie surface several times a second.

## Ownership

- `src/pages/studio` owns the screen, the tray panel (`ui/tray-panel.tsx`), and the navigation into snap selection and the editor.
- `src/pages/movies` owns the movie tab's grid.
- `src/features/compose-movie` owns starting a movie from the tray, committing cut lists and style settings, starting generation, and the app-wide generation runner (see [Movie editor](movie-editor.md)).
- `src/entities/tray` owns the tray store: pick order, the ten-snap cap, and the `{ added, rejected }` outcome. It holds ids only and never imports `entities/snap` — resolving a tray entry to a snap is the studio's join, through `useSnapsByRefs`.
- `src/entities/movie` owns movies and their persisted store (`snaply.movies`). It never imports `entities/snap`; `SnapRef` is matched structurally by `entities/snap`'s `SnapRefLike`.
- `src/widgets/movie-shelf` owns the movie↔snap read model (`MovieSummary`: cut count, total played seconds, cover frames, date label, job progress, failure reason), the two lane selectors, and the two ways a movie is drawn — `MovieRow` for the board and `MovieTile` for the grid, sharing one status badge and one failure notice. It is a widget because both the studio and the movie tab need the same summary and the same vocabulary, and neither entity may own a cross-entity join. The failure notice is the one card part that acts rather than draws: it calls `compose-movie`'s `startGeneration` itself, so the retry cannot drift between the two surfaces.
- `src/shared/ui/video-frame` draws a video's first frame from the shared thumbnail cache. Business-agnostic — it takes a URI, not a `Snap`.

## Known limitations

- Generation is a local simulation and nothing is composited (see [Movie editor](movie-editor.md) and [Movie playback](movie-playback.md)). A `ready` movie is real state, but its "render" is a length and a timestamp.
- There is no movie-deletion UI, so a movie made by mistake stays on the board.
- The tray is single. Collecting for two movies at once is not possible (concept §11 leaves this open).
- `MovieSummary.dateLabel` reads the clock through `formatDayHeading`, so a movie edited just before midnight keeps reading "오늘" until the screen re-renders.
- Movies are local-only. There is no upload, no server-side composition, and no sync between devices.
