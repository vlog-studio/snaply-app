# Roll detail

## User goal and screen flow

A roll's detail screen shows the moments collected into that roll as a grid **contact sheet** and offers the entry point to develop them into a reel. It realizes the moment-collection "delayed develop" concept: the collected clips are shown as undeveloped negatives (their content is deliberately not revealed) until the roll is developed.

```text
/ (Home)
  -- tap the contact-sheet strip --> /roll/[id]   (roll detail contact sheet)
      -- 현상하기 (undeveloped, has clips) --> /capture/editing   (develop ceremony → reel)
      -- 릴 보기 (already developed) --> /capture/result           (reel player)
```

The route is `/roll/[id]`; `id` is the roll id (today's roll id is `daily-<YYYY-MM-DD>`). It is a guarded stack screen with a themed native header titled "롤 상세".

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Contact-sheet grid | `Functional` | Renders one undeveloped negative frame per clip in the roll, ordered by each clip reference's order, followed by dashed empty slots up to the roll's nominal size (12). Each frame is a frosted negative — the clip's first frame sampled and shown heavily blurred + amber-washed (`shared/ui/negative-frame`) — with a mono edge index and the clip's duration on top; the moment stays illegible by design (미현상). Backed by `pages/roll-detail` joining `entities/roll` + `entities/clip`. |
| Clip count / header | `Functional` | The header edge print (`ROLL · <dayKey> · 미현상/현상됨`), roll title, and `NN/12` counter reflect the real roll. |
| Missing roll | `Functional` | An unknown or malformed id renders a "롤을 찾을 수 없어요" empty state instead of crashing. |
| 현상하기 (develop) | `Functional` | For an undeveloped roll the CTA is enabled only when the roll has at least one clip. It opens the develop ceremony (`/capture/editing?rollId`), which composes and persists the roll's reel and marks it developed (see [Capture flow](capture-flow.md)). |
| 릴 보기 (view reel) | `Functional` | Once the roll is developed (status `developed` with a reel), the CTA becomes "릴 보기" and opens the sequential reel player (`/capture/result?rollId`). |
| Develop status in header | `Functional` | The header edge print shows 미현상 / 현상됨 from the real roll status. |

The empty slots and hidden negative content are intentional (concept §4 "빈칸을 보여준다", §6 flow B). The `/12` roll size is a fixture; only the filled count is derived from data. A clip reference whose clip was removed from the archive is skipped in the grid.

## Ownership and dependencies

- `src/pages/roll-detail` owns the screen composition and the roll↔clip join (`model/use-roll-detail.ts`).
- `src/app/roll/[id].tsx` is the thin route adapter that reads the `id` parameter.
- `src/entities/roll` owns the roll and its clip references; `src/entities/clip` owns clip metadata. Neither imports the other — the join lives at this page.
- `src/pages/capture-editing` (develop ceremony) and `src/features/develop-roll` (reel composition + status) own the develop action reached by 현상하기; `src/pages/capture-result` owns the reel player reached by 릴 보기.
- `src/shared/ui` (`snaply-button`, `themed-text`, `theme`) provides presentation primitives; `src/shared/ui/negative-frame` renders each frame's frosted undeveloped-negative background from the clip URI, sampling the first frame through the shared disk-cached `shared/lib/video-thumbnails` util (a one-shot extraction, not a live per-frame video player, so a full contact sheet renders without exhausting hardware decoders).

## Persistence and privacy

The roll and its clip references, and the clip metadata, are persisted locally by the roll/clip stores through `shared/lib/local-store` (document-directory JSON). The underlying video files live in the app document directory via `shared/lib/recording-files`. Nothing is uploaded, shared, or synchronized.
