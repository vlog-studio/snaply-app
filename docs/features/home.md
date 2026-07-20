# Home and moment overview

## User goal

The Home tab presents a quick daily summary and entry points into capture, archive, and settings.

## Current behavior

| Capability | Status | Notes |
| --- | --- | --- |
| Localized current date | `Functional` | The heading formats the device date with the `ko-KR` locale. |
| Settings navigation | `Functional` | The header action opens `/settings`. |
| Contextual quick capture | `Partial` | The hero context card's "3초 남기기" button opens `/capture?context=cafe`; the detected location and time are static. It is the only capture entry point on Home. |
| Daily moment progress | `Prototype` | The `2 / 4` count, progress, cards, labels, and times are fixtures. |
| Daily-vlog readiness | `Prototype` | The preview frames and “two more moments” message are static. |
| Archive navigation | `Functional` | The daily-vlog card opens `/archive`. |

The contextual card's "3초 남기기" button opens `/capture?context=cafe`. When `context=cafe` reaches Capture Setup, that page displays a cafe recommendation banner. The value does not come from device location or a context-detection service, and it does not change the default mood because the default is already `hip`.

Because Capture is reached only from Home (there is no Capture tab), the contextual card is the sole capture entry point; it scrolls with the page rather than staying pinned, and starting a capture from the Archive tab requires returning to Home first.

## Ownership

- `src/pages/home` owns all current Home UI and its static presentation data.
- `src/app/(tabs)/index.tsx` only exposes the page Public API.
- `src/shared/ui/snaply-button`, `themed-text`, and `theme` provide business-agnostic presentation primitives.

No home model, API, feature, widget, entity, persisted moment store, or notification integration currently backs this page.

## Known limitations and next integration boundaries

- Moment cards are not derived from saved recordings.
- Context detection is not connected to `expo-location`, time-of-day rules, or any recommendation service.
- The daily-vlog progress is not calculated from capture sessions.
- The page does not refresh from a persisted or remote source.

When these integrations are implemented, keep screen composition in `pages/home`, move reusable product actions to `features` only after another consumer exists, and update this document with the real data owner and failure/empty states.
