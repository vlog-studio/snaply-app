# Movie editor

## User goal

Users turn the snaps they picked into one short-form vlog: assemble the cuts, choose how it should look and sound, and run the generation. Leaving at any point keeps the movie as a draft on the studio board.

```text
/  (스튜디오)  이 스냅으로 새 무비        →  /movie/[id]
/  (스튜디오)  작업 중 row               →  /movie/[id]
/movies       tile (draft/generating)   →  /movie/[id]
/movies       tile (ready)              →  /movie/[id]/play

/movie/[id]  (편집기)
├── 이름                 rename sheet
├── 1. 조립              the cut list
│   ├── 컷 n · 원본 Ns → 사용 Ns   ▲▼ to reorder, ✕ to drop
│   ├── trim bar         drag either handle; 전체 사용 resets
│   ├── + 스냅 더 넣기    → /snaps?select=1&for=<movieId>
│   └── 컷 구성 저장 / 되돌리기
├── 2. 스타일            style ×4 + 배경 음악 · 자동 자막 · 비율 · 목표 길이
└── 3. 생성              AI로 생성 시작 → progress ring → 무비 보기
                                                        → /movie/[id]/play
```

The three steps are reachable by tapping the header as well as with 이전/다음, so coming back to a draft to change one setting does not mean paging through the cut list.

**The order and lengths decided in ① are kept exactly as they are.** Generation only ever handles transitions, grading, and music; if it were free to re-sort or re-cut, the editor would be pointless. The screen states this, and it is the requirement the backend contract carries (concept §9).

## Starting a movie

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 이 스냅으로 새 무비 | `Functional` | Creates a `draft` from everything in the tray, in pick order, and empties the tray. The editor opens on the new movie. An empty tray makes nothing. |
| Default name | `Functional` | A movie with no given name is called after the day it was started (`무비 08-03`). Starting several on one day suffixes the later ones (`무비 08-03 (2)`). |
| Rename | `Functional` | `이름` in the header opens a sheet with the current name. Clearing it is a valid submission — the movie goes back to being called after the day it was started. Capped at `MovieTitleMaxLength` (20) on the input and in the schema, because a paste arrives past the cap without being typed. |
| Default style and BGM | `Functional` | Every movie starts `calm` / `lofi-walk` / captions on at 9:16, and step ② is where that is changed. |

## ① Assemble

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Cut list | `Functional` | Each row shows the cut's frame, its position, and its length. A cut whose original was deleted keeps its row, marked `원본이 삭제됐어요 · 빼주세요`, because a row the user cannot see is a row they cannot remove. |
| Reorder | `Functional` | ▲▼ per row. Two buttons are reachable one-handed, work with assistive touch, and need no gesture arbitration inside a scroll view. A drag grid is the richer interaction and can replace this later without changing what it commits — the pattern and its pitfalls are recorded in [Animations and gestures](../frameworks/animations-and-gestures.md). |
| Remove a cut | `Functional` | ✕ per row, disabled for the last remaining cut — a movie must keep at least one. Attempting it explains why. |
| Trim a cut | `Functional` | A two-handled bar per row, dragged. The window snaps to half seconds (`CutTrimStepSec`) and never falls below one second (`MinCutSec`); dragging it back out to the whole snap drops the trim rather than storing a full-width window, so a cut dragged out and back does not read as an edit. `전체 사용` resets a trimmed cut. The row reads `원본 5초 → 사용 2.5초` while trimmed. |
| Add snaps | `Functional` | `+ 스냅 더 넣기` opens the Snap tab in selection mode bound to this movie (`?select=1&for=<movieId>`). Confirming appends the picks to the end of the cut list and returns to the editor. The control shows the remaining room and is disabled at ten cuts. |
| Local edits, one commit | `Functional` | Reordering, removing, and trimming are local until `컷 구성 저장`. This is what lets "a movie keeps at least one cut" be a disabled control rather than a write refused mid-gesture. `되돌리기` drops the working copy, and leaving the step (다음, or tapping another step in the header) commits it. |
| Store moved underneath | `Functional` | If the stored cut list changes while a working copy exists — a save landing, or a snap deleted from the Snap tab — the working copy is abandoned rather than replayed onto a list it no longer describes. |
| Read-only movie | `Functional` | A `generating` or `ready` movie shows its cuts and its trim bars without controls. `failed` stays editable, so a broken generation can be fixed and retried. |

The trim bar follows the finger on the UI thread and reports to JavaScript only when the window crosses a half-second boundary; the geometry it evaluates is unit-tested separately from the gesture (`pages/movie-editor/model/trim-geometry.ts`). Its width is derived from the content column rather than measured, so it lays out correctly on its first frame.

## ② Style

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Pick a style | `Functional` | Four cards — `잔잔한` `경쾌한` `담백한` `감성적인` — each with a description and a two-tone swatch. One tap writes it; there is nothing to stage and no save button. |
| Background music | `Functional` | A sheet lists the five tracks (`무음` included) and one tap writes it. |
| Automatic subtitles | `Functional` | A switch, stored on the movie as `captions`. |
| Ratio | `Functional` | A read-out. 9:16 is the only ratio the product has, and it is stored so a movie keeps its ratio when others arrive. |
| Target length | `Functional` | A read-out of the cut total. Length is decided by trimming in ①, which is a decision the user has already made. |
| Catalogs | `Prototype` | Both catalogs are local constants (`entities/movie/lib/movie-style.ts`, `movie-bgm.ts`) until the backend serves `GET /styles` and `GET /bgms`. `Movie.bgm` is a plain string rather than a union so a stored movie can point at a track this build has never heard of. |
| Read-only movie | `Functional` | Once a job owns the movie the cards and controls are disabled; the settings become a read-out. |

**No style has any effect on what plays.** The settings are stored and shown; nothing is composited.

## ③ Generate

| Capability | Status | Actual behavior |
| --- | --- | --- |
| AI로 생성 시작 | `Prototype` | Puts the movie into `generating` with a job stamped at the current time, then the five steps (`업로드 → 장면 분석 → 컷 다듬기 → 음악·자막 → 렌더`) are paced to about forty seconds and the movie becomes `ready` with a `render` recording when it finished and how long it runs. **No video is composited and no file is produced.** |
| Progress | `Functional` | A ring with the percentage, plus the five steps as a checklist with the running one marked. Both come from the job clock, read twice a second on this screen only. |
| Leaving mid-job | `Functional` | The job belongs to the movie, not to the screen: `MovieGenerationGate` is mounted app-wide, so a job keeps running while the user browses other tabs and is picked back up on the next app start. Progress is derived from the job's start time rather than counted up, so a job whose whole duration passed while the app was closed finishes on the first look. |
| Finished state | `Functional` | Step ③ turns into `완성됐어요` with `무비 보기`, which replaces the editor with [movie playback](movie-playback.md). |
| Nothing to generate | `Functional` | A movie with no cuts is refused rather than started, with an explanation, because a job over an empty cut list can only produce an empty movie. |
| Failure | `Not implemented` | `failed` exists in the model and `features/compose-movie` will run a failed movie again, but the simulation never fails, so no failure or retry UI is built. That is stage 4. |

## Rules and where they live

`features/compose-movie` owns every rule about a movie's cuts, settings, and generation, so none of them depends on a screen remembering a `disabled` prop:

| Rule | Refusal |
| --- | --- |
| At least one cut | `saveCuts` → `empty` |
| At most ten cuts (`MovieSnapLimit`) | `saveCuts` / `appendSnaps` → `full` |
| No cut or style edits once a job owns the movie (`generating` / `ready`) | `saveCuts` → `frozen`, `saveStyle` → `false` |
| Nothing to generate from | `startGeneration` → `empty` |
| Generation only from `draft` or `failed` | `startGeneration` → `frozen` |

A refused commit changes nothing and the editor keeps the working copy so the user can fix it. `appendSnaps` refuses a batch whole rather than adding as many as fit, so the user is never left guessing which half went in; snaps the movie already holds are skipped rather than duplicated. `failed` is editable and re-runnable everywhere `draft` is, so a broken attempt can be fixed rather than restarted.

The rules about what a *trim* may be belong to the entity, not the feature: `withTrim` snaps the window, holds it inside the snap, keeps it above `MinCutSec`, and drops a full-width window. The editor and every screen that prints a length use the same `cutDurationSec` / `cutsDurationSec`, so no two surfaces can disagree about how long a movie is.

## Ownership

- `src/pages/movie-editor` owns the screen and its three steps (`ui/assemble-step.tsx`, `ui/style-step.tsx`, `ui/generate-step.tsx`), the wizard header, the cut row and its trim bar, the working cut list (`model/use-movie-editor.ts`), the trim gesture's geometry (`model/trim-geometry.ts`), and the job clock the progress ring reads (`model/use-job-clock.ts`).
- `src/features/compose-movie` owns starting a movie from the tray (which empties it), committing cut lists and style settings, starting generation, and `MovieGenerationGate` — the app-wide runner that carries a job to its render (`model/use-generation-runner.ts`).
- `src/features/rename-movie` owns the rename sheet and its schema. A feature rather than page code because both of a movie's screens need it — the editor names a draft, and playback is where a finished movie earns a name.
- `src/entities/movie` owns the store and its write actions (`useCreateMovie`, `useUpdateMovieCuts`, `useUpdateMovieStyle`, `useRenameMovie`, `useDeleteMovie`, and the three job actions), the default-title rule (`lib/movie-title.ts`), the style and BGM catalogs, the generation step table and its progress rule (`lib/movie-generation.ts`), and the trim rules (`lib/movie-trim.ts`).
- `src/widgets/movie-shelf` supplies the row and tile that open the editor, and the summaries behind them — including the coarse progress a card shows for a job in flight.
- `src/pages/snaps` handles the `?for=<movieId>` picking mode, appending through `compose-movie`.

## Known limitations

- **Nothing is composited.** Generation is a local simulation: the steps are paced by a clock, no video is produced, `render.uri` is empty, and a finished movie is played by running its cuts in order. Style, BGM, and subtitles are stored settings with no effect on what plays.
- A finished movie's cuts and settings are frozen. Changing them means regenerating, which is stage 4; until then the only route back is deleting the movie — for which there is no UI either.
- Generation never fails, so there is no failure or retry UI.
- Reordering is button-based, not drag-based.
- Trim is set on a half-second grid. Frame-accurate trimming would need a real editor timeline.
- Everything is local. No draft is synced to a backend, so a movie does not follow the user to another device (concept §9 requires `PATCH /movies/:id` for that).
