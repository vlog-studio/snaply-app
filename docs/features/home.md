# Home and moment overview

## User goal

The Home tab is "오늘의 롤" (today's roll): a single bounded section that shows the day's captured moments as a film contact strip and links to the delayed-develop notice. It reflects the moment-collection redesign's darkroom visual language. Home is deliberately single-focus — developed rolls live in the 보관함 (archive) tab, not on Home. Capture itself is not on Home either — it is the center safelight button in the tab bar (concept §6), reachable from either tab.

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Today's-roll section panel | `Partial` | The whole roll is one bounded panel on a raised surface (`backgroundElement` with a border) so the film-black strip reads as film against the near-black page instead of dissolving into it. Its header — the edge print, the `오늘의 롤` title (`heading`, integrated inside the panel), and the `NN/12 · 미현상` counter — sits inside the panel. |
| Today's-roll edge print | `Partial` | The panel header stamps a mono "edge print" (`ROLL NNN · <date>`) with the device date formatted `en-CA` (ISO-like), plus a `NN/12 · 미현상` counter. The clip count (`NN`) and the roll number (`NNN`, the roll's real ordinal among daily rolls) are both derived from the roll store. The `/12` is an intentional soft display target (concept §4, "빈칸을 보여준다"), not a hard capacity — the "all-day" rule keeps accepting clips past 12. |
| Contact-sheet film strip | `Partial` | The strip shows one undeveloped negative frame (edge index) per real clip in today's roll (up to a 6-frame preview), followed by dashed empty slots. Clip content is hidden by design (미현상). Tapping the strip opens the full roll at `/roll/[id]`. The perforation styling is decorative. |
| Delayed-develop notice | `Partial` | A compact hint row inside the panel (`DARKROOM · 하루가 끝나면 현상돼요 · 자세히 ›`) opens a bottom sheet with the full "하루가 끝나면 현상해요" copy. The sheet's clip count and estimated-reel length (`clips × 5s`, formatted `m:ss`) are computed from today's real roll clip count; the explanatory copy is static. The sheet is the shared `shared/ui/bottom-sheet` shell. |

Capture has moved off Home entirely. There is no longer a Home capture ring; the tab bar's center safelight button opens `/capture` from any tab (see [Application shell and navigation](app-shell-and-navigation.md)). Home no longer passes a `context` search param to Capture. The developed-rolls shelf preview has been removed from Home; developed rolls are reached through the 보관함 (archive) tab (see [Recording archive](recording-archive.md)).

## Ownership

- `src/pages/home` owns all current Home UI and its remaining static presentation data, including the develop-notice bottom-sheet content.
- `src/app/(tabs)/index.tsx` only exposes the page Public API.
- `src/entities/roll` backs the today's-roll clip counter and the roll ordinal via `useTodayRoll`/`useRolls`; the roll is created/restored on app entry by `src/_app/providers/daily-roll-gate.tsx`.
- `src/widgets/developed-rolls-shelf` still provides `formatReelLength` (used by the develop-notice estimate); its `useDevelopedRolls` read model now feeds only the archive, not Home.
- `src/shared/ui/bottom-sheet` provides the business-agnostic bottom-sheet shell (platform `Modal` + native slide, backdrop-tap to dismiss) used for the develop notice.
- `src/shared/ui/themed-text`, `fade-in-view`, and `theme` provide business-agnostic presentation primitives.

The clip counter and roll ordinal are backed by the persisted roll/clip stores (`entities/roll`, `entities/clip`, via `shared/lib/local-store`). The contact-sheet frame content stays hidden by design.

## Known limitations and next integration boundaries

- The contact-sheet frame count is derived from today's roll, but frame content stays hidden (undeveloped) by design.
- The develop notice copy is static; only its clip count and estimated length are derived.
- Home no longer previews developed rolls; that shelf lives in the 보관함 (archive) tab. Home is intentionally a single "오늘의 롤" section, so it looks sparse until the day's clips fill the strip.
- "촬영 중 테마 롤" from the concept §6 Home description is not shown — the MVP only has the daily roll (themed rolls are deferred to v1.1+).
- The counter and contact sheet reflect the local persisted stores; there is no remote source yet.
- See [Roll detail](roll-detail.md) for the full contact sheet and develop entry point reached by tapping the strip.

When these integrations are implemented, keep screen composition in `pages/home`, move reusable product actions to `features` only after another consumer exists, and update this document with the real data owner and failure/empty states.
