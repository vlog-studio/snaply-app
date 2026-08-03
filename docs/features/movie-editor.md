# Movie editor

## User goal

Users assemble a movie from the snaps they picked: reorder the cuts, drop the ones that do not fit, add more, and leave with the result saved as a draft they can come back to.

```text
/  (스튜디오)  이 스냅으로 새 무비  →  /movie/[id]
/movies       tile                →  /movie/[id]

/movie/[id]  (편집기)
├── 1. 조립          the cut list — implemented
│   ├── 컷 n · N초    ▲ ▼ to reorder, ✕ to drop
│   ├── + 스냅 더 넣기 → /snaps?select=1&for=<movieId>
│   └── 컷 구성 저장 / 되돌리기
├── 2. 스타일        not built yet
└── 3. 생성          not built yet
```

A movie always passes through the same three steps (concept §6). The header shows all three from the start, so the flow is legible even though only the first is implemented.

**The order decided here is kept exactly as it is.** Generation is only ever going to handle transitions, grading, and music; if it were free to re-sort the cuts, the editor would be pointless. The screen states this, and it is the requirement the backend contract carries (concept §9).

## Starting a movie

| Capability | Status | Actual behavior |
| --- | --- | --- |
| 이 스냅으로 새 무비 | `Functional` | Creates a `draft` from everything in the tray, in pick order, and empties the tray. The editor opens on the new movie. An empty tray makes nothing. |
| Default name | `Functional` | A movie with no given name is called after the day it was started (`무비 08-03`). Starting several on one day suffixes the later ones (`무비 08-03 (2)`). |
| Rename | `Not implemented` | The entity supports it (`useRenameMovie`); no control is wired to it yet. |
| Default style and BGM | `Partial` | Every movie starts `calm` / `lofi-walk` at 9:16. These are placeholders until the style step lands and the catalogs move to the server. |

## Assemble step

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Cut list | `Functional` | Each row shows the cut's frame, its position, and its length. A cut whose original was deleted keeps its row, marked `원본이 삭제됐어요 · 빼주세요`, because a row the user cannot see is a row they cannot remove. |
| Reorder | `Functional` | ▲▼ per row. Two buttons are reachable one-handed, work with assistive touch, and need no gesture arbitration inside a scroll view. A drag grid is the richer interaction and can replace this later without changing what it commits — the pattern and its pitfalls are recorded in [Animations and gestures](../frameworks/animations-and-gestures.md). |
| Remove a cut | `Functional` | ✕ per row, disabled for the last remaining cut — a movie must keep at least one. Attempting it explains why. |
| Add snaps | `Functional` | `+ 스냅 더 넣기` opens the Snap tab in selection mode bound to this movie (`?select=1&for=<movieId>`). Confirming appends the picks to the end of the cut list and returns to the editor. The control shows the remaining room and is disabled at ten cuts. |
| Local edits, one commit | `Functional` | Reordering and removing are local until `컷 구성 저장`. This is what lets "a movie keeps at least one cut" be a disabled control rather than a write refused mid-gesture. `되돌리기` drops the working copy. |
| Store moved underneath | `Functional` | If the stored cut list changes while a working copy exists — a save landing, or a snap deleted from the Snap tab — the working copy is abandoned rather than replayed onto a list it no longer describes. |
| Read-only movie | `Functional` | A `generating` or `ready` movie shows its cuts without controls. `failed` stays editable, so a broken generation can be fixed and retried. |
| Trim | `Not implemented` | The model carries `trim` per cut and the commit preserves it, but no UI sets it; every cut plays whole. |

## Rules and where they live

`features/compose-movie` owns every rule about a movie's cut list, so none of them depends on a screen remembering a `disabled` prop:

| Rule | Refusal |
| --- | --- |
| At least one cut | `empty` |
| At most ten cuts (`MovieSnapLimit`) | `full` |
| No cut edits once a job owns the movie (`generating` / `ready`) | `frozen` |

A refused commit changes nothing and the editor keeps the working copy so the user can fix it. `appendSnaps` refuses a batch whole rather than adding as many as fit, so the user is never left guessing which half went in; snaps the movie already holds are skipped rather than duplicated.

## Ownership

- `src/pages/movie-editor` owns the screen, the wizard header, the cut row, and the working cut list (`model/use-movie-editor.ts`).
- `src/features/compose-movie` owns starting a movie from the tray (which empties it) and committing cut lists, with the rules above.
- `src/entities/movie` owns the store and its write actions (`useCreateMovie`, `useUpdateMovieCuts`, `useRenameMovie`, `useDeleteMovie`) and the default-title rule (`lib/movie-title.ts`).
- `src/widgets/movie-shelf` supplies the row and tile that open the editor, and the summaries behind them.
- `src/pages/snaps` handles the `?for=<movieId>` picking mode, appending through `compose-movie`.

## Known limitations

- Steps ② (style) and ③ (generation) do not exist. The editor ends at a saved draft; nothing renders a movie yet.
- There is no rename, no movie deletion UI, and no trim UI.
- Reordering is button-based, not drag-based.
- Everything is local. No draft is synced to a backend, so a movie does not follow the user to another device (concept §9 requires `PATCH /movies/:id` for that).
