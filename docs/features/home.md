# Home and moment overview

## User goal

The Home tab is "오늘의 롤" (today's roll): the day's captured moments shown as a film contact strip, the safelight capture affordance, a delayed-develop notice, and a preview of the archive shelf. It reflects the moment-collection redesign's darkroom visual language.

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Today's-roll edge print | `Partial` | The header stamps a mono "edge print" (`ROLL 019 · <date>`) with the device date formatted `en-CA` (ISO-like), plus a `NN/12 · 미현상` counter. The `NN` (clip count) is bound to today's real roll (`useTodayRoll`); the `ROLL 019` label and the `/12` roll size are still fixtures. |
| Contact-sheet film strip | `Partial` | The strip shows one undeveloped negative frame (edge index) per real clip in today's roll (up to a 6-frame preview), followed by dashed empty slots. Clip content is hidden by design (미현상). Tapping the strip opens the full roll at `/roll/[id]`. The perforation styling is decorative. |
| Safelight capture affordance | `Partial` | The amber capture ring opens `/capture?context=cafe`; it is styled as a viewfinder ring with a "꾹 눌러 담기" hint but is a plain tap (the press-and-hold viewfinder is a later milestone). It is the only capture entry point on Home. |
| Delayed-develop notice | `Partial` | The "하루가 끝나면 현상해요" card is static copy, but its clip count and estimated-reel length are computed from today's real roll clip count. |
| Shelf preview / archive navigation | `Functional` | The shelf section's "보관함 →" link opens `/archive`; the spine covers and empty slot beside it are fixtures. |

The capture affordance opens `/capture?context=cafe`. When `context=cafe` reaches Capture Setup, that page displays a cafe recommendation banner. The value does not come from device location or a context-detection service, and it does not change the default mood because the default is already `hip`.

Because Capture is reached only from Home (there is no Capture tab), this ring is the sole capture entry point; it scrolls with the page rather than staying pinned, and starting a capture from the Archive tab requires returning to Home first.

## Ownership

- `src/pages/home` owns all current Home UI and its remaining static presentation data.
- `src/app/(tabs)/index.tsx` only exposes the page Public API.
- `src/entities/roll` backs the today's-roll clip counter via `useTodayRoll`; the roll is created/restored on app entry by `src/_app/providers/daily-roll-gate.tsx`.
- `src/shared/ui/snaply-button`, `themed-text`, and `theme` provide business-agnostic presentation primitives.

The clip counter is backed by the persisted roll store (`entities/roll`, via `shared/lib/local-store`). The contact-sheet frames, shelf covers, `ROLL 019` label, and `/12` roll size are not yet backed by data.

## Known limitations and next integration boundaries

- The contact-sheet frame count is derived from today's roll, but frame content stays hidden (undeveloped) by design; shelf covers are still fixtures.
- Context detection is not connected to `expo-location`, time-of-day rules, or any recommendation service.
- The `/12` roll size and `ROLL 019` label are fixtures; only the clip count and the contact-sheet frame count are derived from the roll.
- The counter and contact sheet reflect the local persisted roll store; there is no remote source yet.
- See [Roll detail](roll-detail.md) for the full contact sheet and develop entry point reached by tapping the strip.

When these integrations are implemented, keep screen composition in `pages/home`, move reusable product actions to `features` only after another consumer exists, and update this document with the real data owner and failure/empty states.
