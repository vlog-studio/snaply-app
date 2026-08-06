# The movie screen

## User goal

Users run a movie, watch it, fix what came back, and run it again. All of that happens on one screen, because it is one object at four points of its life.

```text
/  (스튜디오)  이 스냅으로 새 무비        →  /movie/[id]
/  (스튜디오)  작업 중 / 최근 완성 row    →  /movie/[id]
/movies       any tile                  →  /movie/[id]
/template/[id]  이대로 만들기            →  /movie/[id]   (an editable draft)

/movie/[id]  (무비) — a timeline studio, not a scroll: every zone is always on screen
├── back bar             ← · the movie's title · ✎ (rename sheet) — the title rides
│                         the bar, so naming the movie costs the stage no height
├── stage                the player on an editable movie; the progress ring under a job
│                         an edit shows up in it the moment it lands
├── transport            under the stage: 재생/일시정지 on the left, 되돌리기 ↺ / 복원 ↻
│                         on the right (hidden under a job)
├── timeline strip       every cut as a clip drawn as long as it plays, on one seconds
│                         scale under a ruler of second marks, running under a playhead
│                         fixed at the middle of the screen; tap = select + the stage
│                         jumps there; playback moves the highlight; the selected clip
│                         grows a trim handle outside each edge while stopped (‹ › where
│                         footage remains, a bar where the file ends)
│                         + tile = 스냅 더 넣기 → /movie/[id]/add-snaps
├── chips                스타일 · 세부 — each opens a bottom sheet
│                         스타일: the four style cards
│                         세부: 배경 음악, 자동 자막, 순서 고정, 비율, 목표 길이, 완성(있으면)
└── footer               a fixed-height action slot (plus notices above it):
                          no selection — 생성: AI로 생성 시작 / 다시 시도 /
                            이 구성으로 다시 만들기 · 공유 (ready)
                          a cut selected — the cut inspector: ◀ ▶ move, ✕ drop,
                            length read-out, 전체 사용
```

**Editing happens outside a run, never under one.** Generation becomes slow remote work once a real backend runs it (the LLM integration), so a `draft` is where the user settles the cut order, the cut lengths, and the style **before** paying for a run — and fixing a result afterwards is the same controls on the same screen. Only a `generating` movie is frozen, because an edit under a job would make the result describe a cut list that no longer exists. This replaced the edit-after-generation rule from the 2026-08-03 planning round on 2026-08-05, which itself had replaced the three-step wizard (조립 → 스타일 → 생성).

There is no separate playback route. Watching a finished movie and fixing it are the same visit, and two routes would have meant two places that can edit one cut list.

**The layout is a timeline studio (2026-08-05).** The previous layout was one long scroll — player, cut list, 순서 고정, style panel, generate panel — so checking an edit meant scrolling back to the top. Now the stage, the strip, and the inspector are fixed zones that never scroll apart: the stage always shows the cut list being edited, the strip and the stage point at the same cut in both directions, and the settings that used to be sections (스타일, 세부, 순서 고정) are sheets opened from chips. Nothing about *what* can be edited changed; only where it sits.

**The prose left the screen (2026-08-05).** Two blocks of text used to bracket the working zones: a status line under the title (`컷 N개 · 길이 · 아직 만들지 않았어요`) and a three-line summary under the generate button (the same configuration again, plus `보통 40초쯤 걸리고, 앱을 나가도 계속돼요` and `아직 프로토타입 — 합성 없이 컷을 순서대로 이어 재생해요`). Together they cost about 110dp of the one zone that has to stretch, the stage, and they were restating zones the user was already looking at. Both are gone, and the title and a ✎ moved onto the back bar's own 44dp row (`BackBar`'s optional `title`/`action`), which costs nothing.

Where each part is read now:

| It used to say | Where the user reads it now |
| --- | --- |
| 컷 N개, 길이 | The strip draws every cut as long as it plays on a seconds ruler; the inspector reads out the selected cut's length; 세부 holds 목표 길이 (컷 합계) |
| 스타일, 음악 | The 스타일 and 세부 chips carry their current values as their second line |
| 만드는 중이에요, 보통 40초쯤 걸리고 · 앱을 나가도 계속돼요 | The progress panel filling the stage — the ring, the five steps, and its own `앱을 나가도 계속돼요` line |
| 만들지 못했어요 | The stored reason in the footer notice, above `다시 시도` |
| 아직 만들지 않았어요 | The `AI로 생성 시작` button itself |
| 지금 완성본은 새로 만든 것으로 바뀌어요 | The `이 구성으로 다시 만들기` label; **there are no versions** is a standing rule of this document, not a per-visit reminder |
| `{시각} 완성` | A 완성 read-out in the 세부 sheet — the only part that had nowhere else to be |
| 아직 프로토타입 — 합성 없이 컷을 순서대로 이어 재생해요 | **Nowhere in the app.** The limitation is real and unchanged (see [Known limitations](#known-limitations)); the screen no longer discloses it |

## What each status shows

| Status | What is on the screen |
| --- | --- |
| `draft` | The stage previews the cuts, the transport plays and walks edits, the strip and inspector are controls, the chips open editable sheets, and the footer's slot runs `AI로 생성 시작` — or holds the inspector while a cut is selected. |
| `generating` | The progress ring and the five-step checklist fill the stage; the strip stays visible as a read-out (no add tile, no inspector), the sheets open read-only, and the footer is empty. Leaving is expected. |
| `ready` | The stage plays the result, the same controls, and the footer offers `이 구성으로 다시 만들기` beside 공유. |
| `failed` | The same controls, with the stored reason and `다시 시도` in the footer. |

## Running a movie

| Capability | Status | Actual behavior |
| --- | --- | --- |
| AI로 생성 시작 | `Prototype` | Puts the movie into `generating` with a job stamped at the current time; the five steps (`업로드 → 장면 분석 → 컷 다듬기 → 음악·자막 → 렌더`) are paced to about forty seconds and the movie becomes `ready` with a `render` recording when it finished and how long it runs. **No video is composited and no file is produced.** |
| Progress | `Functional` | A ring with the percentage, plus the five steps as a checklist with the running one marked. Both come from the job clock, read twice a second on this screen only. A card elsewhere shows a coarser bar (see [Studio and movies](studio.md)). |
| Leaving mid-job | `Functional` | The job belongs to the movie, not to the screen: `MovieGenerationGate` is mounted app-wide by `_app`'s `MovieGenerationBridge`, so a job keeps running while the user browses other tabs and is picked back up on the next app start. Progress is derived from the job's start time rather than counted up, so a job whose whole duration passed while the app was closed finishes on the first look. |
| 이 구성으로 다시 만들기 | `Prototype` | Regeneration is the same act as the first run and the same code path: `beginMovieJob` drops the previous render and error, so the old result never outlives the movie that replaced it. The button's label (`이 구성으로 다시 만들기`) is the only warning that the finished movie will be replaced — the sentence that used to spell it out went with the footer summary on 2026-08-05, and nothing asks for a confirmation. **There are no versions** — a regenerated movie has one render, the newest. |
| 다시 시도 | `Functional` | A `failed` movie runs again from the cut list and settings it kept. Reachable from all three places a failed movie appears: the studio row, the movie-tab tile (both through `widgets/movie-shelf`'s `MovieFailureNotice`), and this screen. |
| Nothing to generate | `Functional` | A movie with no cuts is refused rather than started, with an explanation, because a job over an empty cut list can only produce an empty movie. |
| Announce the end | `Partial` | With 무비 완성 알림 on ([Me tab](me.md)), a job that ends — either way — presents a local notification, so the user who walked away is told. It is local because the job is local; when the backend generates, this becomes an FCM message. Nothing arrives if the app was force-quit, because then the job never reached its end either. |

### How a job fails

There is no remote work to break, so `failed` is not a simulated coin flip. It is one real thing that can happen: the user deletes the last original a running job was built from. Deleting a snap strips it from every movie that references it ([Snap library](snaps.md#deleting-an-original)), and a job with no cuts left can only render nothing.

`useGenerationRunner` checks this on every look rather than only at the last step — waiting out thirty more seconds to be told the material is gone is a pointless wait — and refuses to judge it at all before the snap store has rehydrated, when every cut would look deleted. A retry is offered only when the movie still has cuts; with none, the copy sends the user to the cut list instead of to a retry that would fail again immediately.

## Watching it

**There is no rendered video file.** No compositing backend exists, so a finished movie is played by running its cuts back to back, each inside its trim window. That is deliberate rather than a placeholder: the order and lengths the user settled on are exactly what they get back. The same player previews a `draft`, so a trim can be judged before the run is started.

**The stage plays the stored cut list — which is always current, because edits commit as they land** (the staged-copy model and its save button were removed with the transport, 2026-08-05). The point of keeping the stage on screen is that a reorder, a trim, or a removal is *seen*: the stage holds its place in the edited list and pauses on the new frame the moment the edit lands. What the stage shows is exactly what a generation is built from.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Sequential playback | `Functional` | The stage opens paused on the first cut's frame — entering the screen is coming to work, not asking to watch, so playing is always asked for (the transport or a stage tap; 2026-08-05, replacing autoplay on entry). Once playing, the cuts run in stored order with no gap between them. Two players alternate: while one plays, the other holds the next cut preloaded and paused on its first frame, so the swap is instant with no black flash. After each swap the freed player preloads the cut after that. |
| Trim-aware playback | `Functional` | A cut starts at its window's start and is advanced when the position reaches its end, rather than waiting for the file to run out. `playToEnd` still catches the untrimmed case. The outgoing player is paused at the boundary — a cut ends with file left over, and an unpaused one would keep playing unseen but audible. |
| Pause, resume, replay | `Functional` | The transport's 재생/일시정지 button under the stage (leftmost, mirroring the stage's state through `onPlayingChange`), and tapping the stage does the same; after the last cut, either replays from the first. |
| Progress | `Functional` | One segment per cut across the bottom, filled up to the cut playing now, plus a `컷 n / N` counter. |
| Linked to the timeline, both ways | `Functional` | Tapping a strip clip jumps the stage to that cut's first frame, *paused* (`CutPlayer`'s `jumpTo` handle), and hand-scrolling the strip scrubs: when the drag comes to rest, the stage seeks to the moment left under the playhead, paused on its frame (`seekTo`) — selecting and scrubbing are choosing what to work on, not asking to watch; the transport plays. As playback advances, `onCutChange` moves the strip's highlight and the inspector along with it, and `onProgress` runs the strip under its playhead. |
| Shows every edit as it lands | `Functional` | When the playlist changes under the player — a reorder, a trim, a removal — it lands paused on the *selected* cut (the one the edit was about, via `editIndex`) rather than wherever playback happened to be, and never remounts, so no blink. The player's two slots identify what they hold by *file*, not by playlist position — a reorder renumbers the cut on the stage without touching its file, so the stage is seeked in place instead of reloaded; an index-keyed check here made every reorder blank the frame and flash the file's frame zero (the pre-trim footage) while the reload's seek was in flight. The two players' initial sources are pinned at mount: `useVideoPlayer` keys the native player on its source argument, so reading the live playlist there rebuilt both players whenever a reorder or removal changed the list's first two entries ([Animations and gestures](../frameworks/animations-and-gestures.md) records the pitfall). Two Android platform facts are compensated for: `timeUpdate` fires on its interval even while paused, so the boundary watch and `advance` act only while the stage is meant to be playing — a parked position past a boundary used to auto-play the movie on entry, and a pending seek got "caught up" twice; and the default SurfaceView ignores view opacity, so both `VideoView`s render on `surfaceType="textureView"` — the double buffer swaps slots by opacity, and on SurfaceView the top view stayed visible no matter which slot was active, which showed the idle slot's preloads (another cut, and its replace-blank) on the stage. |
| Every original deleted | `Functional` | A cut whose original was deleted is skipped rather than shown as a gap; a movie with nothing left to play says so instead of mounting a player with no source. |
| Rendered file | `Not implemented` | `Movie.render.uri` is where a composited file will go. When one exists, a movie that has it should play as a single video and this player stays for the movies generated before it. |

Playback is native media, so it is verified on a device rather than in JavaScript tests — the resolution from the cut list to its playlist, and the index mapping between the strip and the player (a dead cut sits in the strip but not in the playlist), are what the unit tests cover (`model/playback-cuts.test.ts`).

## Composing and fixing it

Available whenever no job owns the movie — the same controls settle a `draft` before its first run and fix a `ready` or `failed` result after one. Only a `generating` movie shows them as a read-out.

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Timeline strip | `Functional` | Every cut as a clip whose width is its play length on one shared seconds scale (`TimelinePxPerSec`), filled with repeating thumbnail tiles, under a ruler with a dot every half second and a numbered mark on the whole seconds. Cuts sit flush — a gap would be pixels that stand for no time and the ruler would drift. Tapping selects the cut and jumps the stage there; tapping the strip's empty space (the ruler, the gaps, the lead-ins) — or the focused clip itself a second time — deselects: the trim handles retract and the inspector row closes, while the playhead stays put. The second-tap toggle applies only to the focused (stopped, editable) clip; while playing, a tap on the selected clip still means "jump here". A cut whose original was deleted keeps its clip at a stand-in width — danger-marked, still selectable — because a cut the user cannot see is a cut they cannot remove; the inspector reads `원본이 삭제됐어요 · 빼주세요` on it. |
| Playhead | `Functional` | An ember line fixed at the middle of the screen, with the strip running under it, the way an editing timeline works — rather than a marker travelling along a strip that stands still. "Now" is therefore always in the same place. The content leads and trails with half a viewport so the movie's first and last moments can reach the middle, which also makes a clip's content coordinate and the scroll offset that centres it the same number. The stage reports its position four times a second (`PlaybackProgressIntervalSec`, the one interval the player's trim-boundary watch and the strip's follow both use) and the strip glides linearly to one report ahead over exactly one interval, so it moves at the speed the movie does instead of stepping. When the movie ends, the stage reports the last cut's trim end as its final position, so the playhead comes to rest on the movie's actual end instead of up to one report interval short of it. The scroll offset is a shared value written straight to the scroll view from `useAnimatedReaction`, so following playback costs no renders; a trim drag or a hand-scroll switches the following off and takes the axis. Reduced motion places the strip instead of gliding it. |
| Scrubbing | `Functional` | The strip is the scrubber: hand-scrolling drags the movie under the fixed playhead, and when the drag — and any momentum it was released with — comes to rest, the moment under the line becomes the playback position (`playheadAtX`, the inverse of the playhead's placement math). The stage seeks there and pauses on the frame, the selection and inspector move to that cut, and playing again is the transport's job. An overscroll settles on the movie's first or last moment. Landing on a dead cut moves the playhead and selection (so the inspector can offer its removal) but the stage cannot show it. |
| Cut inspector | `Functional` | One row for whichever cut is selected — position, length read-out (`사용 2.5초`), ◀ ▶, ✕, and `전체 사용` (shown while trimmed) — occupying the footer's action slot in place of the generate button. The slot's height is fixed at one button, so selecting and releasing a cut swaps the occupant instead of adding and removing a row; the stage, which takes the leftover height, never jumps (deselecting brings the generate button back). The cut's length itself is set on the timeline, not here. The `전체 사용` line keeps its slot within the row even when hidden, for the same reason, as playback crosses trimmed and untrimmed cuts. |
| Reorder | `Functional` | ◀ ▶ in the inspector move the selected cut, and the selection follows it. Two buttons are reachable one-handed, work with assistive touch, and need no gesture arbitration; a drag strip can replace them later without changing what is committed — the pattern and its pitfalls are in [Animations and gestures](../frameworks/animations-and-gestures.md). The swap is animated: each clip whose slot changed glides from its old strip position to its new one (a FLIP transform over the flex layout, on the reflow spring), the moved cut drawing on top as the pair cross — on a strip longer than the screen, an instant swap reads as clips teleporting. Reduced motion places clips immediately. |
| Remove a cut | `Functional` | ✕ in the inspector, disabled for the last remaining cut — a movie must keep at least one. Attempting it explains why. Removing selects the neighbor rather than jumping home. |
| Trim a cut | `Functional` | On the timeline itself: the selected clip (while editable **and while the stage is stopped** — selection follows playback, and handles that appeared on the way past would flicker across the strip once per cut) grows an amber handle *outside* each edge — hung over the neighbouring clips via negative margins, so the strip layout is undisturbed and a minimum-length cut still shows its content. A handle wears a chevron pointing outward when trimmed-off footage remains on that side (drawn as an SVG in the grip bar's own stroke, so `‹` and `|` read as one family) — drag outward to lengthen, inward to shorten — and a plain bar when the window already touches the file's end, so an untrimmed cut reads `| |` and can only be shortened. Dragging resizes the clip itself: its width and the reel's slide follow the finger on the UI thread, so the cut is always drawn at what it plays instead of expanding to the whole snap. A touch down on a handle locks the strip's scroll — offset-based arbitration cannot separate two gestures on the same axis — and `onFinalize` hands it back. The window snaps to tenths of a second (`CutTrimStepSec`) and never falls below 0.4 seconds (`MinCutSec`); dragging it back out to the whole snap drops the trim rather than storing a full-width window. `전체 사용` in the inspector resets a trimmed cut. |
| Add snaps | `Functional` | The dashed `+` tile at the end of the strip (showing the remaining room, disabled at ten cuts) pushes `/movie/[id]/add-snaps`: the snap library, always picking, measured against this movie's ten-cut cap. Confirming appends the picks to the end of the cut list and returns here. It is a root-stack screen of its own (`pages/add-snaps`) rather than the Snap tab it resembles — until 2026-08-06 it was `/snaps?select=1&for=<movieId>`, and pushing a *tab* route from this screen mounts a second tab navigator over it, which answered the confirming `back` by switching to its first tab: adding a cut landed the user on the 스튜디오 screen instead of back here. Nothing on the picker plays or deletes an original; it is one errand and it ends on the movie. |
| Edits write through, walked with undo/redo | `Functional` | Every edit — a reorder, a removal, a settled trim — commits through `compose-movie` the moment it lands; there is no staged copy and no save button. The transport's ↺/↻ replay the lists each write replaced (`useMovieCuts` keeps them per visit). "A movie keeps at least one cut" is still a disabled control — the guards that used to gate the one commit gate each edit — and a refused write changes nothing. A drag that settles where it started writes nothing and pushes no history entry. |
| Store moved underneath | `Functional` | If the stored cut list changes for a reason other than this screen's own write — a snap deleted from the Snap tab, snaps appended by the picker — the undo/redo history is dropped rather than replayed onto a list it no longer describes. |
| Style, BGM, subtitles | `Functional` | The 스타일 chip opens a sheet with the four style cards (it stays open after a pick — choosing a look is comparing looks); the 세부 chip opens a sheet with the five BGM tracks as pills (`무음` included), the captions switch, and 순서 고정. Each writes straight through; there is nothing to stage. The chips carry the current style and track, so the sheets only need opening to change something. A draft starts from the defaults or, for a template, what the template asked for. |
| Ratio, target length | `Functional` | Read-outs in the 세부 sheet. 9:16 is the only ratio the product has, and the length follows the trims. |
| Catalogs | `Prototype` | Both catalogs are local constants (`entities/movie/lib/movie-style.ts`, `movie-bgm.ts`) until the backend serves `GET /styles` and `GET /bgms`. `Movie.bgm` is a plain string rather than a union so a stored movie can point at a track this build has never heard of. |
| Rename | `Functional` | The ✎ on the back bar, beside the title it edits, opens a sheet with the current name. Clearing it is a valid submission — the movie goes back to being called after the day it was started. Capped at `MovieTitleMaxLength` (20) on the input and in the schema, because a paste arrives past the cap without being typed. |

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
| AI arrangement at generation | `Partial` | For an `ai` movie, `startGeneration` re-sorts the cut list by the snaps' capture times and stores it before starting the job. **That is the whole of "AI arranges" today** — chronological is a real arrangement and the one template matching produces, but no model looks at the pictures. It is visible when a snap is appended to an AI-arranged movie: the new cut drops into its place in the day instead of sitting at the end. Because a draft is reviewed before the run, the 순서 고정 row states that an `ai` order will be re-arranged at run time — and rearranging by hand locks it. A cut whose original is gone stops the re-sort entirely rather than being dropped. |
| Hand it back | `Functional` | Turning the switch off writes `arranger: 'ai'` again, on any movie no job owns. |

## Sharing

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 무비 공유 | `Not implemented` | The export path is complete — `useShareMovie` hands `Movie.render.uri` to the OS share sheet through `shared/lib/sharing` (`expo-sharing`) — but no movie has a rendered file, so the control is shown disabled with the reason rather than hidden. |

A movie's cuts are the user's own originals; the movie is the composition of them. There is no composition — no on-device compositor is available in the Expo SDK 57 toolchain, and no backend renders one — so there is no file that *is* the movie. The app does not paper over that: it will not share one cut in a movie's place, or a re-labelled original. When a renderer fills `Movie.render.uri`, the control enables itself with no further change.

## Rules and where they live

`features/compose-movie` owns every rule about a movie's cuts, settings, arrangement, and generation, so none of them depends on a screen remembering a `disabled` prop:

| Rule | Refusal |
| --- | --- |
| No cut or style edits while a job owns the movie (`generating`) | `saveCuts` → `frozen`, `saveStyle` → `false` |
| At least one cut | `saveCuts` → `empty` |
| At most ten cuts (`MovieSnapLimit`) | `saveCuts` / `appendSnaps` → `full` |
| No second job while one is running | `startGeneration` → `frozen` |
| Nothing to generate from | `startGeneration` → `empty` |

`canEditMovie` is exported so the screen asks the same question the commit answers, rather than deciding for itself which statuses are editable. A refused edit changes nothing — the stored list stays as it was and the reason is shown. `appendSnaps` refuses a batch whole rather than adding as many as fit; snaps the movie already holds are skipped rather than duplicated.

The rules about what a *trim* may be belong to the entity, not the feature: `withTrim` snaps the window, holds it inside the snap, keeps it above `MinCutSec`, and drops a full-width window. Every screen that prints a length uses the same `cutDurationSec` / `cutsDurationSec`, so no two surfaces can disagree about how long a movie is.

## Ownership

- `src/pages/movie` owns the screen and its parts (`ui/movie-page.tsx`, `timeline-strip.tsx`, `timeline-cut.tsx`, `cut-inspector.tsx`, `cut-player.tsx`, `style-picker-sheet.tsx`, `detail-sheet.tsx`, `generate-footer.tsx`, `generation-progress.tsx`, `refusal-notice.tsx` — which owns the wording of every refusal, so the footer's notice and the one a `generating` movie shows in its place cannot state the same rule differently), the cut list's write-through edits and their undo/redo history (`model/use-movie-cuts.ts`), the cut-list→playlist resolution, the strip↔player index mapping, and how often the stage reports its position (`model/playback-cuts.ts`), the strip's seconds↔pixels layout, ruler marks, and playhead placement (`model/timeline-layout.ts`), the trim gesture's geometry (`model/trim-geometry.ts`), the job clock the ring reads (`model/use-job-clock.ts`), and the export decision (`model/use-share-movie.ts`). It replaced `pages/movie-editor` and `pages/movie-detail`, which were one screen split across two routes; the timeline layout later replaced the long-scroll layout (`cut-list.tsx`, `cut-row.tsx`, `style-panel.tsx`, `arrangement-row.tsx`, `generate-panel.tsx`, `model/use-movie-playback.ts`) in place.
- `src/features/compose-movie` owns starting a movie from the tray or a template, committing cut lists and style settings, the arrangement rules, starting generation, and `MovieGenerationGate` — the app-wide runner that carries a job to its render or to a failure (`model/use-generation-runner.ts`) and, when asked, announces the end (`lib/announce-job-end.ts`).
- `src/_app/providers/movie-generation-bridge.tsx` mounts the gate with the user's 무비 완성 알림 preference. The preference belongs to `features/notification-settings` and features must not import each other, so the app layer composes them — the same shape as `GeofenceGate`.
- `src/features/rename-movie` owns the rename sheet and its schema. A feature rather than page code because a movie earns its name at two different moments — as a draft and once it has been seen.
- `src/entities/movie` owns the store and its write actions (including `useSetMovieArranger` and the four job actions), the default-title rule, the style and BGM catalogs, the generation step table and its progress rule, the trim rules, and the arrangement predicates (`lib/movie-arrangement.ts`).
- `src/widgets/movie-shelf` supplies the row and tile that open the screen, and the summaries behind them.
- `src/pages/add-snaps` owns the picker screen behind the strip's `+` tile (`/movie/[id]/add-snaps`): it draws `widgets/snap-grid`, refuses what the movie has no room for, appends through `compose-movie`, and returns to the movie. It states its own "무비를 찾을 수 없어요 / 지금은 컷을 더 넣을 수 없어요" when the movie disappears or a job takes it while the picker is open.
- `src/widgets/snap-grid` supplies the day-grouped grid, the pick-order and cap rules, and the selection bar the picker shares with the Snap tab ([Snap library](snaps.md#ownership)).
- `src/shared/lib/sharing` is the `expo-sharing` adapter (`canShareFiles`, `shareFile`) with a `.web.ts` stub — transport only, no product decisions.
- `src/app/movie/[id]/index.tsx` and `src/app/movie/[id]/add-snaps.tsx` are the route adapters; both screens are registered in `src/_app/routes/root-layout.tsx`.

## Known limitations

- **Nothing is composited.** Generation is a local simulation: the steps are paced by a clock, no video is produced, `render.uri` is empty, and a finished movie is played by running its cuts in order. Style, BGM, and subtitles are stored settings with no effect on what plays. **The screen no longer says this** — the footer's `아직 프로토타입` line was removed with the rest of the summary prose on 2026-08-05, so nothing in the app tells the user that a `ready` movie is a playlist rather than a file. Restore a disclosure here before this reaches anyone outside the team.
- Regeneration keeps no history. The previous render is dropped when the new job starts, so there is no way back to the version the user just replaced.
- There is still no movie-deletion UI (`useDeleteMovie` has no caller), so a movie started from the wrong snaps can be emptied down to one cut but never removed.
- Losing every original is the only way a job fails today. Backend errors join it when `POST /movies` exists; the store field (`Movie.error`) and the recovery UI already take an arbitrary message.
- AI arrangement is capture-time order, not a model's judgement.
- Reordering is button-based, not drag-based, and trim is set on a tenth-second grid.
- The undo/redo history lives in the screen: it is dropped on leaving, and when the cut list changes from outside (a snap deleted, snaps appended). Undoing a reorder restores the order but not `arranger` — a hand that moved a cut keeps the lock (순서 고정) even after stepping the move back.
- Scrubbing seeks on release, not live: the stage holds its frame while the finger drags the strip and seeks only when the scroll rests, so there is no frame-by-frame preview during the drag itself.
- Each cut plays its own recorded sound and no track is mixed.
- A very short snap gets a very narrow clip, because the strip is honest about time and a hold can be released after a quarter second. Nothing widens it to a comfortable tap target, since a minimum width would put the ruler off the cuts.
- 무비 공유 cannot be pressed: there is no rendered file to export.
- Everything is local. No draft is synced to a backend, so a movie does not follow the user to another device (concept §9 keeps `PATCH /movies/:id` as the contract for that).
