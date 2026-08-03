# Movie templates

## User goal

Users pick the shape of the movie first — 동네 산책, 하루 요약 — and the app goes looking through the library for material that fits it. What it cannot fill, it asks them to go and shoot.

```text
/  (스튜디오)  템플릿으로 시작 card   →  /template/[id]

/template/[id]  (템플릿)
├── AI가 고른 이유        one line saying why these snaps, and what was actually looked at
├── slot rows            per scene: the frame, when it was shot, 같은 외출 확신 NN%
│   ├── filled           빼기
│   ├── dropped          지금 찍기 · 되돌리기
│   └── empty            지금 찍기        → /capture, and back into this row
└── 이대로 만들기          → /movie/[id], already generating
```

This is the second way into a movie and it sits beside the tray rather than replacing it: the tray is "make a movie out of *these*", a template is "make me something like *this*". Both stay on the studio ([Studio and movies](studio.md)).

## What the match can and cannot do

**The app has never looked at a picture.** It has no scene classifier, no object detection, and no server to ask. Everything the match knows is a timestamp and, when one was recorded, a pair of coordinates ([Capture flow](capture-flow.md), [Snap library](snaps.md)).

So the match answers one question — *which snaps were shot on the same outing* — and lays that outing into the template's slots in the order it happened. A slot's name (`골목`, `가게`) is shooting direction for a person, never a claim about what the snap in it contains. The screen states this in as many words, because a template that silently implied recognition would be making a promise the build cannot keep.

| Step | Rule |
| --- | --- |
| Group into outings | A snap joins the outing before it when it was shot within three hours of the previous one **and** within 2 km of where that outing started. Coordinates only ever break an outing, never hold one together — snaps with no place are grouped on time alone, because refusing to group them would leave a location-less library with nothing at all. |
| Choose one | The outing that fills the most slots wins; the most recent breaks a tie. A single snap is not an outing. |
| Lay it out | Fewer snaps than slots fills from the top and leaves the tail empty. More snaps than slots takes an evenly spaced sample that always keeps the first and last, so a long walk still starts and ends where it did. |

### What the confidence number means

`같은 외출 확신 NN%` is exactly what it says: how sure the app is that this snap belongs to the outing the others came from. It is computed from two measurements and nothing else — how close in time the snap sits to its nearest neighbour in the outing, and how far it is from where the outing started. A snap with no coordinates is scored on time alone and scaled down, because that is a genuinely weaker claim.

It is **not** a match against the slot's label. Printing one would have been the easy version and the dishonest one: the planning round's own risk note was that a wrong auto-match costs trust faster than no auto-match, and a percentage with nothing behind it is how that happens.

## Filling the gaps

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Template cards | `Functional` | The studio lists every template with how far the library gets through it (`4/6컷 있음 · 2컷 더`). A template the library cannot fill still appears — the shortfall is the invitation. |
| Auto-match | `Functional` | Runs on open and again whenever the library changes, so a snap shot mid-session shows up without a refresh. Pure and unit-tested (`lib/match-template.ts`). |
| 지금 찍기 | `Functional` | Opens `/capture` and remembers which row asked. On return, if the library has a newer snap than it did on the way out, that snap goes into that row. Coming back without shooting leaves the row empty. The snap is filed in the library like any other — nothing about capture changes. |
| 빼기 / 되돌리기 | `Functional` | Drops a proposed snap out of a slot, and puts it back. There is no "pick a different snap" — a wrong cut is cheaper to fix on the movie screen, after the movie exists, which is where every other correction lives too. |
| 고친 것 되돌리기 | `Functional` | Puts every slot back the way the match proposed it. Shown only once something has been changed. |
| Nothing to propose | `Functional` | A library with no outing in it says so and leaves every slot empty with its `지금 찍기`. The screen is still useful — that is the case it was designed for. |
| 이대로 만들기 | `Functional` | Creates a movie from the filled slots in slot order, with the template's style and BGM, marked `arranger: 'ai'`, **starts generation immediately**, and replaces the screen with the movie. There is nothing to arrange first: arranging is what just happened, and everything else is fixed on the result ([The movie screen](movie.md)). |
| Manual changes are not stored | `Functional` | Dropping and shooting are held on the screen. Nothing exists to write to until the movie is created, and leaving costs nothing. |
| One snap, one slot | `Functional` | A snap shot for an empty slot joins the library, so the next match would happily propose it for another slot as well. The slot it was shot for claims it, and the other one stays empty — a duplicate would have become two cuts of the same three seconds. |
| The tray is untouched | `Functional` | Making a movie from a template does not empty the tray. Two ways of gathering material must not consume each other. |

## Ownership

- `src/entities/movie-template` owns the template model and the catalog (`lib/movie-template-catalog.ts`). It reaches `entities/movie` for `MovieStyle` through `entities/movie/@x/movie-template.ts` — a type-only cross-reference, which is the one case the [boundary rules](../conventions/module-boundaries.md#entity-cross-reference-exception-x) allow it.
- `src/features/fill-template` owns the match (`lib/match-template.ts`), the reason line (`lib/describe-match.ts`), the editable slot state (`model/use-template-fill.ts`), and the studio's readiness read-out (`model/use-template-offers.ts`).
- `src/pages/movie-template` owns the screen, the slot row, and the camera round trip.
- `src/pages/studio/ui/template-panel.tsx` owns the cards on the studio.
- `src/features/compose-movie` owns `startMovieFromTemplate` and every rule about the movie it creates.
- `src/shared/lib/geo` is the distance helper — business-agnostic geometry, no snaps and no outings in it.

## Catalog policy

The catalog is four templates in a local constant, and that is the point. The recipe direction was set aside once (concept §3) because a catalog somebody has to keep running is a standing cost, and this is the version with none: the templates ship with the build and change when the build does. There is no seasonal content, no server, and no editorial calendar. If one is ever wanted, `GET /templates` replaces the catalog module and nothing else moves.

## Known limitations

- **No semantic matching.** A slot named 골목 is filled by the third snap of the outing, not by a picture of an alley. Real scene matching needs an on-device or server classifier and a snap-metadata pipeline that does not exist.
- Snaps captured before location was recorded have no coordinates, so an older library is matched on time alone and scores lower. Nothing is wrong with those snaps; the app is just less sure.
- Only one outing is ever proposed. There is no "다른 조합" and no way to match against a specific day.
- A slot cannot be filled from the library by hand — only by shooting, or by taking what the match proposed. Replacing a cut happens on the movie screen afterwards.
- The catalog is fixed at build time and templates cannot be created, edited, or reordered by the user.
- Nothing about a template is stored on the movie it makes, so a finished movie does not know which template it came from and cannot be re-matched.
