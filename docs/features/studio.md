# Studio and movies

## User goal

The Studio (`/`) is the workbench the app opens on: the snaps picked out for the next movie, the movies still being worked on, and the most recent finished ones. The Movie tab (`/movies`) is the full list of everything made.

```text
/  (스튜디오)
├── 담아둔 스냅       the tray: picked snaps in pick order, n / 10, 약 N초
│                    · 스냅 고르러 가기 / +  → /snaps?select=1
│                    · ✕ per snap, 비우기
│                    · 이 스냅으로 새 무비   (disabled — see below)
├── 작업 중           movies with status draft / generating / failed
└── 최근 완성         movies with status ready

/movies  (무비)
└── every movie, most recent edit first
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
| Start a movie from the tray | `Not implemented` | `이 스냅으로 새 무비` is present and **disabled**. Nothing can create a movie yet — the editor and `features/compose-movie` land in the next stage of the rebuild (see `docs/guides/ai-vlog-studio/refactor-plan.md` §4). |

## Movie lanes

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 작업 중 lane | `Partial` | Reads `useInProgressMovies()` — every movie whose status is not `ready`, so drafts, in-flight generations, and failures all surface in one place. Because no movie can be created yet, the lane renders its empty state in every case today. |
| 최근 완성 lane | `Partial` | Reads `useReadyMovies()`. Same caveat as above. |
| Movie tab grid | `Partial` | `/movies` reads `useMovieSummaries()` for its count and otherwise shows an empty state pointing at the tray. The card grid arrives with the editor. |
| Open a movie | `Not implemented` | There is no movie detail or editor route yet. |

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
├── jobId?        set while a generation job is in flight
├── render?       { uri?, renderedAt, durationSec }
└── error?        why the last generation failed
```

`failed` is a first-class status rather than a flavor of draft: a generation job is remote work that really does fail, and the user has to be able to tell "I have not run this yet" from "it broke".

In this stage the movie store exposes reads only (`useMovies`, `useMovieById`, `useMoviesHydrated`) plus `useRemoveSnapsEverywhere` for the delete cascade. The write actions (`createMovie`, `updateMovieCuts`, style, and the generation lifecycle) arrive with their callers so the slice never publishes an unused API.

## Ownership

- `src/pages/studio` owns the screen, the tray panel (`ui/tray-panel.tsx`), and the navigation into snap selection.
- `src/pages/movies` owns the movie tab.
- `src/entities/tray` owns the tray store: pick order, the ten-snap cap, and the `{ added, rejected }` outcome. It holds ids only and never imports `entities/snap` — resolving a tray entry to a snap is the studio's join, through `useSnapsByRefs`.
- `src/entities/movie` owns movies and their persisted store (`snaply.movies`). It never imports `entities/snap`; `SnapRef` is matched structurally by `entities/snap`'s `SnapRefLike`.
- `src/widgets/movie-shelf` owns the movie↔snap read model (`MovieSummary`: cut count, total seconds, cover frames, date label) and the two lane selectors. It is a widget because both the studio and the movie tab need the same summary, and neither entity may own a cross-entity join.
- `src/shared/ui/video-frame` draws a video's first frame from the shared thumbnail cache. Business-agnostic — it takes a URI, not a `Snap`.

## Known limitations

- No movie can be created, opened, played, or generated yet. Everything below the tray is structure waiting for the editor.
- The tray is single. Collecting for two movies at once is not possible (concept §11 leaves this open).
- `MovieSummary.dateLabel` reads the clock through `formatDayHeading`, so a movie edited just before midnight keeps reading "오늘" until the screen re-renders.
- Movies are local-only. There is no upload, no server-side composition, and no sync between devices.
