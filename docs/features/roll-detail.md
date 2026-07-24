# Roll detail

## User goal and screen flow

A roll's detail screen shows the moments collected into that roll as a grid **contact sheet**, lets the user play any cut's original clip, edit an undeveloped roll's cuts (add / remove / reorder), and offers the entry point to develop the roll into a reel. The cuts are still drawn as frosted negatives — the film look of the "delayed develop" concept — but tapping a cut plays the original: the concept styling no longer withholds the user's own footage (product decision 2026-07: playback UX outranks the illegibility conceit, which the archive's cut tab already bypassed).

```text
/ (Home)
  -- tap the contact-sheet strip --> /roll/[id]   (roll detail contact sheet)
      -- tap a cut --> full-screen single-cut player (modal, any roll status)
      -- long-press a cut (undeveloped) --> selection mode → 롤에서 빼기
      -- 순서 바꾸기 (undeveloped, ≥2 cuts) --> tap-to-renumber mode → 적용
      -- tap an empty slot (undeveloped) --> 컷 추가 sheet (pick archive clips)
      -- 현상하기 (undeveloped, has clips) --> /capture/editing   (develop ceremony → reel)
      -- 릴 보기 (already developed) --> /capture/result           (reel player)
```

The route is `/roll/[id]`; `id` is the roll id (today's roll id is `daily-<YYYY-MM-DD>`). It is a guarded stack screen with a themed native header titled "롤 상세".

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Contact-sheet grid | `Functional` | Renders one frosted negative frame per clip in the roll (`shared/ui/negative-frame`), ordered by each clip reference's order, followed by dashed empty slots up to the roll's nominal size (12). Each frame keeps a mono edge index and the clip's duration. Backed by `pages/roll-detail` joining `entities/roll` + `entities/clip`. |
| Single-cut playback | `Functional` | Tapping a cut opens a full-screen modal playing the original clip (`shared/ui/video-preview`, expo-video, looping, native controls, unmuted) with a close button and a meta overlay (cut number, duration, mood, captured date). Works on any roll status. |
| Remove cuts (undeveloped only) | `Functional` | Long-press a cut to enter selection mode (checkbox overlays; hardware back exits the mode). The footer swaps to 취소 · N개 선택 · 롤에서 빼기. Removing drops the roll's clip references only — the original cuts stay in the archive — so there is no confirmation dialog. |
| Reorder cuts (undeveloped only) | `Functional` | The 순서 바꾸기 chip (shown with ≥2 cuts) enters tap-to-renumber mode: tapping cuts assigns new positions 1, 2, … (tapping again unassigns); 적용 commits via the roll store's `reorderRollClips`. Cuts left unnumbered keep their relative order after the numbered ones. |
| Add cuts (undeveloped only) | `Functional` | Tapping a dashed empty slot (shown as ＋) opens the 컷 추가 sheet listing archive clips not yet in the roll, newest first, with legible first-frame thumbnails. Multi-select is capped at the roll's remaining empty slots; picks are numbered and appended to the roll in pick order. |
| Clip count / header | `Functional` | The header edge print (`ROLL · <dayKey> · 미현상/현상됨`), roll title, and `NN/12` counter reflect the real roll. |
| Missing roll | `Functional` | An unknown or malformed id renders a "롤을 찾을 수 없어요" empty state instead of crashing. |
| 현상하기 (develop) | `Functional` | For an undeveloped roll the CTA is enabled only when the roll has at least one clip. It opens the develop ceremony (`/capture/editing?rollId`), which composes and persists the roll's reel and marks it developed (see [Capture flow](capture-flow.md)). |
| 릴 보기 (view reel) | `Functional` | Once the roll is developed (status `developed` with a reel), the CTA becomes "릴 보기" and opens the sequential reel player (`/capture/result?rollId`). |
| Develop status in header | `Functional` | The header edge print shows 미현상 / 현상됨 from the real roll status. |

Editing (add / remove / reorder) is gated to `undeveloped` rolls: a developed roll is a finished artifact whose composed reel would go stale if membership or order changed. Wanting a different reel means loading a new roll (the footer hint says so). The gate lives in the page UI; the store mutations themselves are not status-aware.

The empty slots are intentional (concept §4 "빈칸을 보여준다") and, on an undeveloped roll, double as the add-cuts entry point. The `/12` roll size is a fixture; only the filled count is derived from data, and adding is capped so the roll never exceeds it. A clip reference whose clip was removed from the archive is skipped in the grid.

## Ownership and dependencies

- `src/pages/roll-detail` owns the screen composition, the edit modes (selection / reorder state machine), and the roll↔clip joins (`model/use-roll-detail.ts` for the roll's cuts, `model/use-addable-clips.ts` for the archive clips still addable to it). Its `ui` segment owns `roll-cut-cell` (mode-aware grid cell), `clip-player-modal` (single-cut playback), and `add-clips-sheet` (clip picker).
- `src/app/roll/[id].tsx` is the thin route adapter that reads the `id` parameter.
- `src/entities/roll` owns the roll, its clip references, and the membership mutations (`useAddClipToRoll`, `useRemoveClipFromRoll`, `useReorderRollClips` — reorder rewrites each reference's `order`, keeping unlisted references after the listed ones); `src/entities/clip` owns clip metadata. Neither imports the other — the joins live at this page.
- `src/pages/capture-editing` (develop ceremony) and `src/features/develop-roll` (reel composition + status) own the develop action reached by 현상하기; `src/pages/capture-result` owns the reel player reached by 릴 보기.
- `src/shared/ui` (`snaply-button`, `themed-text`, `theme`, `video-preview`) provides presentation primitives; `src/shared/ui/negative-frame` renders each frame's frosted negative background from the clip URI, and the add-sheet's legible thumbnails come from the same disk-cached `shared/lib/video-thumbnails` util (one-shot extraction, not a live per-frame video player, so a full contact sheet renders without exhausting hardware decoders). The single-cut player's date line uses `formatRecordingDate` from `features/manage-recordings`.

## Persistence and privacy

The roll and its clip references (including order), and the clip metadata, are persisted locally by the roll/clip stores through `shared/lib/local-store` (document-directory JSON). Edits (add / remove / reorder) mutate the persisted roll store immediately. The underlying video files live in the app document directory via `shared/lib/recording-files`. Nothing is uploaded, shared, or synchronized.

## Known limitations

- Editing is unavailable once a roll is developed; there is no "re-develop" flow yet.
- Removing a cut from the roll never deletes the original recording — permanent deletion lives in the archive's cut tab.
- The add sheet lists clips from the clip store; a recording that was never 담기'd (no clip entity) cannot be added from here.
- Reordering is tap-to-renumber; drag-and-drop is a possible later upgrade.
