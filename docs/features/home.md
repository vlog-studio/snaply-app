# Home and moment overview

## User goal

The Home tab is "오늘의 롤" (today's roll): the day's captured moments shown as a film contact strip, a delayed-develop notice, and a preview of the archive shelf. It reflects the moment-collection redesign's darkroom visual language. Capture itself is not on Home — it is the center safelight button in the tab bar (concept §6), reachable from either tab.

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Today's-roll edge print | `Partial` | The header stamps a mono "edge print" (`ROLL NNN · <date>`) with the device date formatted `en-CA` (ISO-like), plus a `NN/12 · 미현상` counter. The clip count (`NN`) and the roll number (`NNN`, the roll's real ordinal among daily rolls) are both derived from the roll store. The `/12` is an intentional soft display target (concept §4, "빈칸을 보여준다"), not a hard capacity — the "all-day" rule keeps accepting clips past 12. |
| Contact-sheet film strip | `Partial` | The strip shows one undeveloped negative frame (edge index) per real clip in today's roll (up to a 6-frame preview), followed by dashed empty slots. Clip content is hidden by design (미현상). Tapping the strip opens the full roll at `/roll/[id]`. The perforation styling is decorative. |
| Delayed-develop notice | `Partial` | The "하루가 끝나면 현상해요" card is static copy, but its clip count and estimated-reel length (`clips × 5s`, formatted `m:ss`) are computed from today's real roll clip count. |
| Shelf preview | `Functional` | The shelf section shows the two most-recently developed rolls as spine covers (real data via `useDevelopedRolls`), each opening its reel at `/capture/result`, followed by a trailing empty slot ("첫 롤" when none are developed, otherwise "빈 롤"). The "보관함 →" link opens `/archive`. |

Capture has moved off Home entirely. There is no longer a Home capture ring; the tab bar's center safelight button opens `/capture` from any tab (see [Application shell and navigation](app-shell-and-navigation.md)). Home no longer passes a `context` search param to Capture.

## Ownership

- `src/pages/home` owns all current Home UI and its remaining static presentation data.
- `src/app/(tabs)/index.tsx` only exposes the page Public API.
- `src/entities/roll` backs the today's-roll clip counter and the roll ordinal via `useTodayRoll`/`useRolls`; the roll is created/restored on app entry by `src/_app/providers/daily-roll-gate.tsx`.
- `src/widgets/developed-rolls-shelf` provides the `useDevelopedRolls` read model and `formatReelLength` shared with the archive shelf.
- `src/shared/ui/themed-text`, `fade-in-view`, and `theme` provide business-agnostic presentation primitives.

The clip counter, roll ordinal, and shelf preview are all backed by the persisted roll/clip stores (`entities/roll`, `entities/clip`, via `shared/lib/local-store`). The contact-sheet frame content stays hidden by design.

## Known limitations and next integration boundaries

- The contact-sheet frame count is derived from today's roll, but frame content stays hidden (undeveloped) by design.
- The develop notice copy is static; only its clip count and estimated length are derived.
- "촬영 중 테마 롤" from the concept §6 Home description is not shown — the MVP only has the daily roll (themed rolls are deferred to v1.1+).
- The counter, shelf, and contact sheet reflect the local persisted stores; there is no remote source yet.
- See [Roll detail](roll-detail.md) for the full contact sheet and develop entry point reached by tapping the strip.

When these integrations are implemented, keep screen composition in `pages/home`, move reusable product actions to `features` only after another consumer exists, and update this document with the real data owner and failure/empty states.
