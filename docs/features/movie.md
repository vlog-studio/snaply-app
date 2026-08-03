# The movie screen

## User goal

Users run a movie, watch it, fix what came back, and run it again. All of that happens on one screen, because it is one object at four points of its life.

```text
/  (스튜디오)  이 스냅으로 새 무비        →  /movie/[id]
/  (스튜디오)  작업 중 / 최근 완성 row    →  /movie/[id]
/movies       any tile                  →  /movie/[id]
/template/[id]  이대로 만들기            →  /movie/[id]   (already generating)

/movie/[id]  (무비)
├── 이름                 rename sheet
├── player              ready / failed only — the cuts in order, tap to pause or replay
├── 컷 순서와 길이         the cut list: ▲▼ reorder, ✕ drop, trim bar, + 스냅 더 넣기
│                        a read-out until the movie has been generated
├── 순서 고정             ready / failed only — whether generation may re-arrange
├── 스타일               ready / failed only — style ×4, 배경 음악, 자동 자막, 비율, 길이
├── 생성                 AI로 생성 시작 / 진행 링 / 다시 시도 / 이 구성으로 다시 만들기
└── 무비 공유             ready only — disabled while no rendered file exists
```

**Editing happens after generation, never before.** Picking the material is one decision and reacting to a result is another, and only the second one has anything to react to. A `draft` therefore shows its cut list as a read-out and one button; the controls appear once there is a movie to point at. This is the inversion the 2026-08-03 planning round asked for, and it replaced the three-step wizard (조립 → 스타일 → 생성) that used to run before generation.

There is no separate playback route. Watching a finished movie and fixing it are the same visit, and two routes would have meant two places that can edit one cut list.

## What each status shows

| Status | What is on the screen |
| --- | --- |
| `draft` | The cut list as a read-out, and `AI로 생성 시작`. Nothing is editable. |
| `generating` | The progress ring and the five-step checklist, then the cut list as a read-out. Leaving is expected. |
| `ready` | The player, the cut list as controls, 순서 고정, the style panel, `이 구성으로 다시 만들기`, and 무비 공유. |
| `failed` | The stored reason and `다시 시도` at the top, then the same controls as `ready`. |

## Running a movie

| Capability | Status | Actual behavior |
| --- | --- | --- |
| AI로 생성 시작 | `Prototype` | Puts the movie into `generating` with a job stamped at the current time; the five steps (`업로드 → 장면 분석 → 컷 다듬기 → 음악·자막 → 렌더`) are paced to about forty seconds and the movie becomes `ready` with a `render` recording when it finished and how long it runs. **No video is composited and no file is produced.** |
| Progress | `Functional` | A ring with the percentage, plus the five steps as a checklist with the running one marked. Both come from the job clock, read twice a second on this screen only. A card elsewhere shows a coarser bar (see [Studio and movies](studio.md)). |
| Leaving mid-job | `Functional` | The job belongs to the movie, not to the screen: `MovieGenerationGate` is mounted app-wide, so a job keeps running while the user browses other tabs and is picked back up on the next app start. Progress is derived from the job's start time rather than counted up, so a job whose whole duration passed while the app was closed finishes on the first look. |
| 이 구성으로 다시 만들기 | `Prototype` | Regeneration is the same act as the first run and the same code path: `beginMovieJob` drops the previous render and error, so the old result never outlives the movie that replaced it. The screen says the current finished movie will be replaced. **There are no versions** — a regenerated movie has one render, the newest. |
| 다시 시도 | `Functional` | A `failed` movie runs again from the cut list and settings it kept. Reachable from all three places a failed movie appears: the studio row, the movie-tab tile (both through `widgets/movie-shelf`'s `MovieFailureNotice`), and this screen. |
| Nothing to generate | `Functional` | A movie with no cuts is refused rather than started, with an explanation, because a job over an empty cut list can only produce an empty movie. |
| Unsaved cuts | `Functional` | Staged cut edits are named before the run rather than silently ignored: the panel says that the saved cut list is what will be made. |
| Announce the end | `Partial` | With 무비 완성 알림 on ([Me tab](me.md)), a job that ends — either way — presents a local notification, so the user who walked away is told. It is local because the job is local; when the backend generates, this becomes an FCM message. Nothing arrives if the app was force-quit, because then the job never reached its end either. |

### How a job fails

There is no remote work to break, so `failed` is not a simulated coin flip. It is one real thing that can happen: the user deletes the last original a running job was built from. Deleting a snap strips it from every movie that references it ([Snap library](snaps.md#deleting-an-original)), and a job with no cuts left can only render nothing.

`useGenerationRunner` checks this on every look rather than only at the last step — waiting out thirty more seconds to be told the material is gone is a pointless wait — and refuses to judge it at all before the snap store has rehydrated, when every cut would look deleted. A retry is offered only when the movie still has cuts; with none, the copy sends the user to the cut list instead of to a retry that would fail again immediately.

## Watching it

**There is no rendered video file.** No compositing backend exists, so a finished movie is played by running its cuts back to back, each inside its trim window. That is deliberate rather than a placeholder: the order and lengths the user settled on are exactly what they get back.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Sequential playback | `Functional` | The cuts play in stored order with no gap between them. Two players alternate: while one plays, the other holds the next cut preloaded and paused on its first frame, so the swap is instant with no black flash. After each swap the freed player preloads the cut after that. |
| Trim-aware playback | `Functional` | A cut starts at its window's start and is advanced when the position reaches its end, rather than waiting for the file to run out. `playToEnd` still catches the untrimmed case. The outgoing player is paused at the boundary — a cut ends with file left over, and an unpaused one would keep playing unseen but audible. |
| Pause, resume, replay | `Functional` | Tapping the stage pauses and resumes; after the last cut the same tap replays from the first. |
| Progress | `Functional` | One segment per cut across the bottom, filled up to the cut playing now, plus a `컷 n / N` counter. |
| Plays the stored cuts, not the staged ones | `Functional` | The player reads the committed cut list, so while an edit is staged it keeps playing the movie as it actually is. Saving is what changes what plays. |
| Every original deleted | `Functional` | A cut whose original was deleted is skipped rather than shown as a gap; a movie with nothing left to play says so instead of mounting a player with no source. |
| Rendered file | `Not implemented` | `Movie.render.uri` is where a composited file will go. When one exists, a movie that has it should play as a single video and this player stays for the movies generated before it. |

Playback is native media, so it is verified on a device rather than in JavaScript tests — the resolution from a movie to its playlist is what the unit test covers (`model/use-movie-playback.test.ts`).

## Fixing it

Available on `ready` and `failed` movies only.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Cut list | `Functional` | Each row shows the cut's frame, its position, and its length. A cut whose original was deleted keeps its row, marked `원본이 삭제됐어요 · 빼주세요`, because a row the user cannot see is a row they cannot remove. |
| Reorder | `Functional` | ▲▼ per row. Two buttons are reachable one-handed, work with assistive touch, and need no gesture arbitration inside a scroll view. A drag grid can replace this later without changing what it commits — the pattern and its pitfalls are in [Animations and gestures](../frameworks/animations-and-gestures.md). |
| Remove a cut | `Functional` | ✕ per row, disabled for the last remaining cut — a movie must keep at least one. Attempting it explains why. |
| Trim a cut | `Functional` | A two-handled bar per row, dragged. The window snaps to half seconds (`CutTrimStepSec`) and never falls below one second (`MinCutSec`); dragging it back out to the whole snap drops the trim rather than storing a full-width window. `전체 사용` resets a trimmed cut. The row reads `원본 5초 → 사용 2.5초` while trimmed. |
| Add snaps | `Functional` | `+ 스냅 더 넣기` opens the Snap tab in selection mode bound to this movie (`?select=1&for=<movieId>`). Confirming appends the picks to the end of the cut list and returns. The control shows the remaining room and is disabled at ten cuts. |
| Local edits, one commit | `Functional` | Reordering, removing, and trimming are local until `컷 구성 저장`. This is what lets "a movie keeps at least one cut" be a disabled control rather than a write refused mid-gesture. `되돌리기` drops the working copy. |
| Store moved underneath | `Functional` | If the stored cut list changes while a working copy exists — a save landing, or a snap deleted from the Snap tab — the working copy is abandoned rather than replayed onto a list it no longer describes. |
| Style, BGM, subtitles | `Functional` | Four style cards, a BGM sheet of five tracks (`무음` included), and a captions switch. Each writes straight through; there is nothing to stage. A movie's first run always uses the defaults or, for a template, what the template asked for — changing them is a thing you do to a result. |
| Ratio, target length | `Functional` | Read-outs. 9:16 is the only ratio the product has, and the length follows the trims. |
| Catalogs | `Prototype` | Both catalogs are local constants (`entities/movie/lib/movie-style.ts`, `movie-bgm.ts`) until the backend serves `GET /styles` and `GET /bgms`. `Movie.bgm` is a plain string rather than a union so a stored movie can point at a track this build has never heard of. |
| Rename | `Functional` | `이름` opens a sheet with the current name. Clearing it is a valid submission — the movie goes back to being called after the day it was started. Capped at `MovieTitleMaxLength` (20) on the input and in the schema, because a paste arrives past the cap without being typed. |

**No style has any effect on what plays.** The settings are stored and shown; nothing is composited.

## 순서 고정 — who arranges the cuts

`Movie.arranger` records who owns the cut order, and it is the one thing generation is allowed to change.

| Value | What it means | How a movie gets it |
| --- | --- | --- |
| `user` | The stored order is final. Generation must not touch it. | Every movie started from the tray or from snap picks. Also any AI-arranged movie the moment the user reorders it. |
| `ai` | Generation may re-arrange the cuts before it runs. | A movie made from a template ([Movie templates](movie-templates.md)). |

The switch is offered rather than required: **rearranging a cut by hand already turns the lock on**, because that is what moving it meant. The user never has to find the switch first, and a later re-arrangement cannot undo what they just did. Trimming a cut is not rearranging one and costs nothing. The switch exists so the order can be handed back.

`arranger` is optional on the stored movie — movies written before the field existed have none, and the local store has no migration step — so every reader goes through `isAiArranged`, which reads a missing value as `user`. Getting that backwards would let generation rewrite a cut list someone arranged by hand.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Lock on manual reorder | `Functional` | `saveCuts` compares the committed snap sequence with the stored one and writes `arranger: 'user'` when they differ. |
| AI arrangement at generation | `Partial` | For an `ai` movie, `startGeneration` re-sorts the cut list by the snaps' capture times and stores it before starting the job. **That is the whole of "AI arranges" today** — chronological is a real arrangement and the one template matching produces, but no model looks at the pictures. It is visible when a snap is appended to an AI-arranged movie: the new cut drops into its place in the day instead of sitting at the end. A cut whose original is gone stops the re-sort entirely rather than being dropped. |
| Hand it back | `Functional` | Turning the switch off writes `arranger: 'ai'` again, on a `ready` or `failed` movie. |

## Sharing

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 무비 공유 | `Not implemented` | The export path is complete — `useShareMovie` hands `Movie.render.uri` to the OS share sheet through `shared/lib/sharing` (`expo-sharing`) — but no movie has a rendered file, so the control is shown disabled with the reason rather than hidden. |

A movie's cuts are the user's own originals; the movie is the composition of them. There is no composition — no on-device compositor is available in the Expo SDK 57 toolchain, and no backend renders one — so there is no file that *is* the movie. The app does not paper over that: it will not share one cut in a movie's place, or a re-labelled original. When a renderer fills `Movie.render.uri`, the control enables itself with no further change.

## Rules and where they live

`features/compose-movie` owns every rule about a movie's cuts, settings, arrangement, and generation, so none of them depends on a screen remembering a `disabled` prop:

| Rule | Refusal |
| --- | --- |
| No cut or style edits until the movie has been generated (`draft` / `generating`) | `saveCuts` → `frozen`, `saveStyle` → `false` |
| At least one cut | `saveCuts` → `empty` |
| At most ten cuts (`MovieSnapLimit`) | `saveCuts` / `appendSnaps` → `full` |
| No second job while one is running | `startGeneration` → `frozen` |
| Nothing to generate from | `startGeneration` → `empty` |

`canEditMovie` is exported so the screen asks the same question the commit answers, rather than deciding for itself which statuses are editable. A refused commit changes nothing and the screen keeps the working copy so the user can fix it. `appendSnaps` refuses a batch whole rather than adding as many as fit; snaps the movie already holds are skipped rather than duplicated.

The rules about what a *trim* may be belong to the entity, not the feature: `withTrim` snaps the window, holds it inside the snap, keeps it above `MinCutSec`, and drops a full-width window. Every screen that prints a length uses the same `cutDurationSec` / `cutsDurationSec`, so no two surfaces can disagree about how long a movie is.

## Ownership

- `src/pages/movie` owns the screen and its parts (`ui/movie-page.tsx`, `cut-list.tsx`, `cut-row.tsx`, `trim-bar.tsx`, `style-panel.tsx`, `arrangement-row.tsx`, `generate-panel.tsx`, `cut-player.tsx`), the working cut list (`model/use-movie-cuts.ts`), the movie→playlist resolution (`model/use-movie-playback.ts`), the trim gesture's geometry (`model/trim-geometry.ts`), the job clock the ring reads (`model/use-job-clock.ts`), and the export decision (`model/use-share-movie.ts`). It replaced `pages/movie-editor` and `pages/movie-detail`, which were one screen split across two routes.
- `src/features/compose-movie` owns starting a movie from the tray or a template, committing cut lists and style settings, the arrangement rules, starting generation, and `MovieGenerationGate` — the app-wide runner that carries a job to its render or to a failure (`model/use-generation-runner.ts`) and, when asked, announces the end (`lib/announce-job-end.ts`).
- `src/_app/providers/movie-generation-bridge.tsx` mounts the gate with the user's 무비 완성 알림 preference. The preference belongs to `features/notification-settings` and features must not import each other, so the app layer composes them — the same shape as `GeofenceGate`.
- `src/features/rename-movie` owns the rename sheet and its schema. A feature rather than page code because a movie earns its name at two different moments — as a draft and once it has been seen.
- `src/entities/movie` owns the store and its write actions (including `useSetMovieArranger` and the four job actions), the default-title rule, the style and BGM catalogs, the generation step table and its progress rule, the trim rules, and the arrangement predicates (`lib/movie-arrangement.ts`).
- `src/widgets/movie-shelf` supplies the row and tile that open the screen, and the summaries behind them.
- `src/pages/snaps` handles the `?for=<movieId>` picking mode, appending through `compose-movie`.
- `src/shared/lib/sharing` is the `expo-sharing` adapter (`canShareFiles`, `shareFile`) with a `.web.ts` stub — transport only, no product decisions.
- `src/app/movie/[id]/index.tsx` is the route adapter; the screen is registered in `src/_app/routes/root-layout.tsx`.

## Known limitations

- **Nothing is composited.** Generation is a local simulation: the steps are paced by a clock, no video is produced, `render.uri` is empty, and a finished movie is played by running its cuts in order. Style, BGM, and subtitles are stored settings with no effect on what plays.
- Regeneration keeps no history. The previous render is dropped when the new job starts, so there is no way back to the version the user just replaced.
- A `draft` cannot be adjusted at all. A movie started from the wrong snaps has to be generated once before it can be fixed — or left, since there is still no movie-deletion UI (`useDeleteMovie` has no caller).
- Losing every original is the only way a job fails today. Backend errors join it when `POST /movies` exists; the store field (`Movie.error`) and the recovery UI already take an arbitrary message.
- AI arrangement is capture-time order, not a model's judgement.
- Reordering is button-based, not drag-based, and trim is set on a half-second grid.
- Playback has no scrubber and no seeking within the movie; each cut plays its own recorded sound and no track is mixed.
- 무비 공유 cannot be pressed: there is no rendered file to export.
- Everything is local. No draft is synced to a backend, so a movie does not follow the user to another device (concept §9 keeps `PATCH /movies/:id` as the contract for that).
