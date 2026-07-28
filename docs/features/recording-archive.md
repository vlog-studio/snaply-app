# Recording archive

## User goal

Users can see which rolls are still waiting to be developed, browse the rolls they have developed, and manage the original cuts behind them.

The Archive is the **film cabinet** (`/archive`): one scroll reading anticipation → what you own → raw material. The 컷/롤 segmented control is gone; the cuts moved behind a drawer at the bottom of the cabinet that opens the pushed `/cuts` screen, which draws them as a **contact strip**. Both screens keep the darkroom visual language (edge prints, film-black tiles, blurred negatives for anything undeveloped).

```text
/archive  (film cabinet)
├── 현상 대기        today's roll + every roll still holding an undeveloped reel,
│                   three at a time with the rest behind +N개 더
├── 현상 완료 · YYYY.MM   developed rolls by month, plus that month's empty-day count
└── 모든 컷 ›        drawer → /cuts

/cuts     (every original cut, as a contact strip)
├── 필터            전체 · 미현상 · 롤 없음 N · 롤별 ▾
├── 일자 스트립      one horizontal 35mm strip per day; roll tint dots under each frame
├── 컷 시트          tap a frame → its metadata, the rolls holding it, 재생 · 롤에 담기 · 빼기 · 삭제
└── 선택 모드        long-press or 선택 →
                    전체 / 미현상 / 롤 없음 → 새 롤로 묶기 · 롤에 담기 · 삭제
                    롤별                  → 롤에서 빼기 · 롤에 담기 · 삭제
```

## Two kinds of roll

A **daily roll** is created for you and carries a `dayKey` — the day it collects. A **free roll** (`type: 'free'`, `collectionRule: 'manual'`) is one you bundled yourself out of selected cuts; it has no `dayKey`, because there is no single day it stands for.

That absence is the whole distinction, and every date the cabinet needs is derived from it rather than stored:

| Question | Daily roll | Free roll |
| --- | --- | --- |
| Which lane? | 현상 대기 until developed | the same lane — anything developable belongs in one place |
| Which month shelf? | the month of its `dayKey` | the month it was bundled (`rollDate` = `dayKey ?? createdAt`) |
| What does the edge print? | its own date | the span its cuts cover, `07-18~07-24` |
| Is it today's roll? | possibly | never — `ensureDailyRoll` and `useTodayRoll` both look for a `dayKey` |
| Can it be developed? | yes | yes; `composeReel` never reads `roll.type` |
| What if it ends up empty? | it stays — an empty today is the invitation to capture | it is retired |

Character (`RollType`), collection rules, and target orientation are **fixed** at 자유 롤 · 수동 · 세로 for a free roll and are shown in the new-roll sheet as an imprint, not as controls. Character changes BGM tone, default length, and cover style, none of which is implemented; the preset cards arrive with themed rolls (v1.1). There is likewise no rename and no direct delete: a name is given once, and a roll is disposed of only by emptying it.

## Film cabinet

| Capability | Status | Notes |
| --- | --- | --- |
| Develop-waiting lane | `Functional` | Today's roll is always present, even with no cuts, as the invitation to capture. Every other roll that still lacks a finished reel joins it once it holds at least one cut, newest first — free rolls beside daily ones, since everything developable has to be in one place for "waiting" to mean anything. The filter is "not finished" rather than "undeveloped", so a roll left mid-ceremony surfaces here instead of falling between the lane and the shelf. |
| Waiting-lane fold | `Functional` | The lane shows three cards (today's roll and the two most recent) and folds the rest behind `+N개 더`, which toggles to `접기`. Daily rolls arrive one a day, but free rolls have no such limit; without the fold a collecting spree would push the shelf off the screen. |
| Waiting-roll card | `Functional` | Today's card is amber: cuts against the remaining empty frames, a fill meter against the 12-cut soft target, and 담기 (or 첫 순간 담기 when empty) opening `/capture`. Any other waiting card is lumen and reads as ready: 현상하기 pushes `/capture/editing?rollId=`. Its heading is the day for a daily roll and the roll's name for a free one, and its footer says `하루 종료` only for a daily roll — a free roll prints the span its cuts cover instead, since a hand-made roll has no day that ended. Tapping either card body opens `/roll/[id]`. Frames render as blurred negatives — nothing in this lane is developed yet — and are sized by how many the strip can hold rather than how many the roll has, so a roll of one or two cuts reads at the same scale as a full day instead of stretching one frame across the card. |
| Developed shelf by month | `Functional` | Developed rolls (status `developed` with a persisted reel) are grouped into `현상 완료 · YYYY.MM` sections, newest month first. Both the section a roll falls in and its position inside it come from `rollDate` — its own day for a daily roll, the day it was bundled for a free one — so a free roll sorts among the daily ones by date instead of sinking to the bottom of its month. |
| Cover art | `Functional` | Each cover is a four-up mosaic of the reel's first frames, read from the same thumbnail cache the cut grid uses, so no new extraction happens. A roll with fewer than four cuts repeats the frames it has. The roll's tint is a 4px spine down the left edge rather than a full-bleed fill. The edge print carries the date: a daily roll's own day, or a free roll's cut span (`07-18~07-24 · 3컷`), because a free roll spends its title on a name. |
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
| Cut sheet | `Functional` | Tapping a frame opens a bottom sheet: its edge print (cut number, duration, orientation, capture mood), its capture date, and every roll holding it with that roll's status. The roll list is read live, so a 빼기 inside the sheet updates it in place. A developed roll's row is marked `멤버십 고정` and its 빼기 is disabled — its reel is a finished artifact, the same rule roll detail enforces. A cut in no roll says so. Actions are 재생, 롤에 담기, per-roll 빼기, and 보관함에서 삭제. |
| Bundle cuts into a new roll | `Functional` | 새 롤로 묶기 leads the selection bar outside a roll filter, and sits under the list in the 롤에 담기 picker so "none of these" is never a dead end. It opens a sheet that asks one thing: a name, and not even that — blank saves as `묶음 MM-DD`, the day it was made, capped at 20 characters and free to duplicate. 성격 · 수집 · 지향 are printed as an imprint, not offered as controls. Creating makes an undeveloped free roll and puts the selected cuts in it in one action; the keyboard's done key creates it too. |
| Bundle confirmation | `Functional` | On success the strip prints `<롤 이름> · N컷으로 묶었어요` in the new roll's own tint, snapping in over 250ms with the release easing, plus a medium haptic. The roll immediately joins the waiting lane, the 롤별 filter, and each bundled frame's dots. On failure the sheet stays open with the typed name and the selection intact and shows `롤을 만들지 못했어요`, so pressing again is the whole retry. |
| Put cuts into a roll | `Functional` | 롤에 담기, from the selection bar or a single cut's sheet, opens a picker of every undeveloped roll — today's first, each with its tint, its cut count, and how many of the selected cuts it already holds. A roll already holding all of them is listed but inert (`이미 담김`). Developed rolls are not offered at all. Adding never touches the original; the frame's roll dots update immediately. |
| Retire an emptied free roll | `Functional` | A free roll that loses its last cut is removed. Nothing points at it, it would stand as an empty card in the waiting lane, and there is no UI for deleting a roll — so emptying one is how you dispose of it. The rule lives in `entities/roll`, not in the action that empties the roll, because taking cuts out and deleting originals can both do it. A daily roll survives holding nothing, and a developed free roll survives too: its reel is a finished artifact. |
| Take cuts out of a roll | `Functional` | 롤에서 빼기 drops the roll's reference and leaves the original in the archive, so it needs no confirmation. From the selection bar it appears only under the `롤별` filter — the one context that answers "out of which roll" — and from the cut sheet it is per roll row. Filtering by a *developed* roll drops the action from the bar entirely and the bar's context line reads `<롤 이름> · 멤버십 고정`, so the only place a frozen roll shows a 빼기 control at all is the cut sheet, where it is visibly disabled next to the reason. A roll that finished developing between render and press refuses the change, and the screen says so rather than reporting a silent success. |
| First-frame thumbnails | `Functional` | Each frame shows the clip's first frame, extracted with `expo-video-thumbnails` and cached under the cache directory by source file name; the film-black gate shows while loading or if extraction fails. |
| Play a cut | `Functional` | 재생 in the cut sheet opens the shared full-screen player (`shared/ui/video-player-modal`): a looping `expo-video` view with native controls over black, its edge print stamped with the capture date and its caption with the length. Roll detail uses the same module with the roll's own wording. |
| Missing original | `Functional` | Clip metadata can outlive its file (a delete removes the file before committing the store write). The sheet checks the file when it opens and, when it is gone, disables 재생 and says so rather than handing a missing URI to the player. |
| Delete a cut | `Functional` | From the cut sheet or the selection bar; the capture-record library deletes one clip at a time. The adapter rejects files outside Snaply's recordings directory. Deletion cascades — see [Deleting an original](#deleting-an-original). |
| Delete confirmation | `Functional` | A dialog of the screen's own, not a platform `Alert`, because it has a list to show: every roll the deletion rewrites, each with its tint, its status, and its cut count before and after (`릴 4→3컷` for a developed roll, counted by its reel). A cut in no roll says so instead. It closes with `복구할 수 없어요`, adding "롤에서만 빼려면 빼기를 쓰세요" only when at least one affected roll still accepts 빼기. |
| Select and act on many cuts | `Functional` | Long-pressing a frame or pressing 선택 enters selection mode and a two-row bar slides up: 취소 · `N컷 선택` with the active filter · 전체선택, over the actions. There are always three, and the leading one follows the filter: `새 롤로 묶기 · 롤에 담기 · 삭제` normally, and `롤에서 빼기 · 롤에 담기 · 삭제` under the `롤별` filter. 빼기 replaces 묶기 rather than joining it — it needs a roll to be taken out of, and inside a roll filter bundling into yet another roll is not what the user came for. The screen is pushed over the tabs, so the bar simply owns the bottom edge. 전체선택 covers what the filter is showing, not the whole archive. One confirmation deletes every selected clip, committing the ones that succeed even if some fail. Android hardware back exits selection mode; leaving the screen exits it. |
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

This is deliberately distinct from taking a cut out of one roll (`features/collect-clips`, used by this screen and by [Roll detail](roll-detail.md)), which drops a reference and leaves the original intact — which is why the delete dialog points at 빼기 as the smaller action. `features/manage-recordings` owns no deletion path at all — it lists and saves files only — so no caller can delete a file without the cascade.

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

- `src/pages/archive` owns the film cabinet: the develop-waiting lane and its fold, the month sections of the developed shelf, and the cut drawer. It holds no cut list of its own.
- `src/pages/archive/ui/pending-roll-card` owns the waiting-roll card in both of its shapes (today / ready to develop); `src/pages/archive/ui/roll-cover` owns the developed cover with its four-up mosaic and tint spine.
- `src/pages/cut-strip` owns the `/cuts` screen. `model/use-cut-strip` is its read model: it joins `entities/clip` with `widgets/clip-membership`, applies the filter, groups cuts into days, and derives each day's status and today's open frames (`useCutRollFilters` supplies the roll picker's options). `ui/cut-film-strip` owns one day's strip and its perforation, `ui/cut-frame` a single frame with its roll dots, `ui/cut-filter-bar` the filter chips, `ui/cut-roll-picker-sheet` the roll picker that narrows the strip, `ui/cut-add-to-roll-sheet` the picker that chooses where cuts go, `ui/cut-new-roll-sheet` the new-roll form, `ui/cut-sheet` the per-cut sheet, `ui/cut-delete-dialog` the delete confirmation, `ui/cut-selection-bar` the contextual bottom action bar, `ui/cut-notice` the one-line report after a collect action, and `ui/roll-status-label` the one Korean status wording the sheet and the dialog share. The page holds the new roll's draft (its cuts, the typed name, the day a blank name falls back to) rather than the sheet, so a second bundle never inherits the first one's name and no render reads the clock.
- `src/widgets/roll-shelf` owns the roll read models — `useRollsAwaitingDevelop` (today + everything still unfinished) and `useDevelopedRollMonths` (developed rolls by month with each month's empty-day count) — plus `formatReelLength`. Both summarize a roll into cover URIs, counts, length, tint, the day it is filed under (`date`), and the span its cuts cover (`dayRange`), by joining `entities/roll` with `entities/clip`.
- `src/features/delete-clip` owns deleting originals: the file, its thumbnail cache, its clip metadata, and every roll reference to it. Consumed by both the cut screen and the capture-record library.
- `src/features/collect-clips` owns the three collect actions — `새 롤로 묶기` (`bundleIntoNewRoll`, which creates the roll and fills it in one action), `롤에 담기`, and `롤에서 빼기` (`useCollectClips`) — plus the rolls a selection may be put into (`useCollectTargets`, undeveloped rolls only, today's first, with how many of the selection each already holds). Both the contact strip and roll detail change membership, which is what makes it a feature; concentrating it also concentrates the frozen-membership rule, which it enforces by reading the roll at call time instead of trusting a disabled control. It reports what it actually did (`CollectOutcome`, `BundleOutcome`), so a refusal is visible rather than silent.
- `src/widgets/clip-membership` owns the reverse of `roll.clipRefs` — which rolls each clip belongs to (`useClipMembership`, `useRollsForClip`), with each roll's stable tint and whether its membership can still be edited, plus `useRollDeleteImpact`, which answers what a deletion would do to each affected roll (cut count before and after, a developed roll counted by its reel). Cross-entity composition shared by clip-side surfaces, so it sits in a widget for the same reason `roll-shelf` does. The cabinet uses it for the drawer's loose-cut count; the strip uses it for its frame dots, its filters, the cut sheet's live roll list, and the delete dialog's affected list.
- `src/entities/roll` owns `rollTint(rollId)` (a roll carries no stored color, so its tint is derived from its id and stays the same wherever that roll is drawn; today's roll always uses the reserved ember `TodayRollTint`), the `DailyRollTarget` soft target, `toDayKey` (the day key the strip groups by), the date derivations `rollDate` / `rollMonthKey` / `formatDayRange` and the month helpers `elapsedDaysInMonth` / `daysInMonth` / `formatMonthKey`, `createManualRoll` (id `manual-<createdAt>`, deduplicated against ids already stored) with `manualRollTitle` / `ManualRollTitleMaxLength` for the name it defaults to and caps, and the invariant that an undeveloped free roll holding no cuts does not exist — applied inside `removeClipFromRoll` and `removeClipsEverywhere` so no path can leave one behind.
- `src/entities/clip` owns the archive of cuts and their metadata — duration, capture mood, orientation, tags — and is what both the strip and the cabinet's counts read.
- `src/features/manage-recordings` owns listing and saving recording files and Korean date/time/day formatting. It owns no deletion path — that moved to `features/delete-clip` so no caller can delete a file without the cascade.
- `src/shared/ui/negative-frame` renders an undeveloped cut as a blurred negative; the waiting-roll card's mini strip uses it. The contact strip shows its frames unblurred — these are the originals, not a roll's withheld reel.
- `src/shared/ui/video-player-modal` owns the full-screen playback chrome — black letterbox, close control, two-line edge-print overlay — over `src/shared/ui/video-preview`'s business-agnostic looping player. Roll detail plays a cut through the same module, so the two surfaces cannot drift apart; each passes its own wording (here the day the cut was taken leads, since the strip has no sequence to name a cut by). `src/shared/ui/bottom-sheet` backs the cut sheet, the roll pickers, and the new-roll sheet. It lifts itself clear of the keyboard (`behavior="padding"` on both platforms, since a transparent status-bar-translucent Modal is not resized by Android's adjustResize) and drops its safe-area bottom padding while the keyboard is up, so a sheet with a text field keeps its primary action reachable instead of hiding it behind the keyboard or lifting past the top of the screen.
- `src/shared/lib/recording-files` owns native file operations — list, persist, delete, exists — and the web fallback.
- `src/shared/lib/video-thumbnails` owns first-frame extraction/caching (keyed by base name), the `useVideoThumbnail` hook that resolves one frame for a URI, and the web fallback.

## Known limitations

- A roll's character, collection rule, and target orientation cannot be chosen: every hand-made roll is 자유 롤 · 수동 · 세로. The preset cards arrive with themed rolls (v1.1), because character is a value nothing reads yet.
- A roll cannot be renamed, and there is no direct delete. A name is given once at creation, and the only way to dispose of a roll is to empty it — which works for a free roll and not at all for a daily one.
- The bundle confirmation is a tinted line that snaps in, not the design's fly-to-cover: `/cuts` has no cover on screen to fly the frames into, and a shared-element transition is out of scope for the same reason the drawer → strip push has none. The haptic and the release easing are there; the flight is not.
- The 롤에 담기 picker and the new-roll sheet are separate sheets, so bundling from inside the picker closes one and opens the other rather than pushing a step.
- Because the list is the clip store, a cut whose file was lost outside the app still appears, with no thumbnail; only the cut sheet says the original is missing.
- A day with cuts but no roll at all reports `현상 준비됨`, which overstates it slightly — nothing can be developed until the cuts are in a roll.
- A month section appears only when that month holds a developed roll, so a month with cuts but nothing developed shows no empty-day count.
- There is no share/export action, media-library save, cloud backup, or recovery after app deletion.
- Deleting an original (single or batch) is permanent and is not mediated by a trash state.
- The capture-record library's own delete still confirms with `Alert.alert` and says nothing about rolls, even though it runs the same cascade. Only the cut screen's dialog names the affected rolls. `Alert.alert` is also a no-op on react-native-web, which a web persistence implementation would have to replace.
