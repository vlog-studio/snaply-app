# Home and moment overview

## User goal

The Home tab is "오늘의 롤" (today's roll): the day's captured moments shown as a film contact strip, the safelight capture affordance, a delayed-develop notice, and a preview of the archive shelf. It reflects the moment-collection redesign's darkroom visual language.

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Today's-roll edge print | `Functional` | The header stamps a mono "edge print" (`ROLL 019 · <date>`) with the device date formatted `en-CA` (ISO-like), plus a `03/12 · 미현상` counter. |
| Contact-sheet film strip | `Prototype` | The filled frames (with edge numbers) and dashed empty slots are fixtures; the `03/12` progress is static. |
| Safelight capture affordance | `Partial` | The amber capture ring opens `/capture?context=cafe`; it is styled as a viewfinder ring with a "꾹 눌러 담기" hint but is a plain tap (the press-and-hold viewfinder is a later milestone). It is the only capture entry point on Home. |
| Delayed-develop notice | `Prototype` | The "하루가 끝나면 현상해요" card and its clip count / estimated-reel length are static copy conveying the delayed-develop concept. |
| Shelf preview / archive navigation | `Functional` | The shelf section's "보관함 →" link opens `/archive`; the spine covers and empty slot beside it are fixtures. |

The capture affordance opens `/capture?context=cafe`. When `context=cafe` reaches Capture Setup, that page displays a cafe recommendation banner. The value does not come from device location or a context-detection service, and it does not change the default mood because the default is already `hip`.

Because Capture is reached only from Home (there is no Capture tab), this ring is the sole capture entry point; it scrolls with the page rather than staying pinned, and starting a capture from the Archive tab requires returning to Home first.

## Ownership

- `src/pages/home` owns all current Home UI and its static presentation data.
- `src/app/(tabs)/index.tsx` only exposes the page Public API.
- `src/shared/ui/snaply-button`, `themed-text`, and `theme` provide business-agnostic presentation primitives.

No home model, API, feature, widget, entity, persisted moment store, or notification integration currently backs this page.

## Known limitations and next integration boundaries

- The contact-sheet frames and shelf covers are not derived from saved recordings or a roll/clip model.
- Context detection is not connected to `expo-location`, time-of-day rules, or any recommendation service.
- The `03/12` progress and estimated-reel length are not calculated from capture sessions.
- The page does not refresh from a persisted or remote source.

When these integrations are implemented, keep screen composition in `pages/home`, move reusable product actions to `features` only after another consumer exists, and update this document with the real data owner and failure/empty states.
