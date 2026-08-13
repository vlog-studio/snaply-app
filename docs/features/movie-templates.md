# Movie templates

## User goal

Users pick the shape of the movie first — 동네 산책, 하루 요약 — and the app goes looking through the library for material that fits it. What it cannot fill, it asks them to go and shoot.

```text
/  (스튜디오)  템플릿으로 시작 card   →  /template/[id]

/template/[id]  (템플릿)
├── slot rows            per scene: the frame, 2026.07.28 13:35 · 3초, NN%
│   ├── filled           ⌃ ⌄ reorder · ✕ drop
│   ├── dropped          지금 찍기 · 되돌리기
│   └── empty            지금 찍기        → /capture, and back into this row
├── 고친 것 되돌리기        shown once anything is dropped, shot, or reordered
└── 이대로 만들기          → /movie/[id], an editable draft
```

This is the second way into a movie and it sits beside hand-picking rather than replacing it: picked snaps are "make a movie out of *these*", a template is "make me something like *this*". Both entries stay on the studio ([Studio and movies](studio.md)).

## Status summary

`Functional` — every step runs for real: the catalog ships with the build, the match is pure and unit-tested, shooting for an empty slot round-trips through `/capture`, and `이대로 만들기` creates a real editable draft. No integration or platform path is missing, which is why this is not `Partial`; the matcher's narrowness (timestamps and coordinates only) is the product's scope, not an unfinished connection. The one open defect is copy, not behavior — nothing on the screen says what the `NN%` measures (see [Known limitations](#known-limitations)).

## What the match can and cannot do

**The app has never looked at a picture.** It has no scene classifier, no object detection, and no server to ask. Everything the match knows is a timestamp and, when one was recorded, a pair of coordinates ([Capture flow](capture-flow.md), [Snap library](snaps.md)).

So the match answers one question — *which snaps were shot on the same outing* — and lays that outing into the template's slots in the order it happened. A slot's name (`골목`, `가게`) is shooting direction for a person, never a claim about what the snap in it contains.

The screen used to say so in as many words. Two edits on 2026-08-03 removed both places it said it: the `AI가 고른 이유` panel that carried the sentence (four lines deep, pushing the slots themselves — the one thing the screen exists to show — under the fold), and then the per-row `같은 외출 확신 NN%` caption, which at least named the number's basis. What is left is a bare `NN%` and a layout that keeps it away from the slot label. **No words on the screen state the limit or the basis any more**; that gap is the screen's one open issue, recorded under [Known limitations](#known-limitations).

| Step | Rule |
| --- | --- |
| Group into outings | A snap joins the outing before it when it was shot within three hours of the previous one **and** within 2 km of where that outing started. Coordinates only ever break an outing, never hold one together — snaps with no place are grouped on time alone, because refusing to group them would leave a location-less library with nothing at all. |
| Choose one | The outing that fills the most slots wins; the most recent breaks a tie. A single snap is not an outing. |
| Lay it out | Fewer snaps than slots fills from the top and leaves the tail empty. More snaps than slots takes an evenly spaced sample that always keeps the first and last, so a long walk still starts and ends where it did. |

### What the confidence number means

The row prints a bare `NN%`. It is how sure the app is that this snap belongs to the outing the others came from, computed from two measurements and nothing else — how close in time the snap sits to its nearest neighbour in the outing, and how far it is from where the outing started. A snap with no coordinates is scored on time alone and scaled down, because that is a genuinely weaker claim.

It is **not** a match against the slot's label. Printing one would have been the easy version and the dishonest one: the planning round's own risk note was that a wrong auto-match costs trust faster than no auto-match, and a percentage with nothing behind it is how that happens.

The number used to carry its own caption, `같은 외출 확신 NN%`. That was dropped on 2026-08-03 — six rows of one contiguous outing all score the same, so the caption repeated a constant six times and cost a third of each row's width. What survives is layout: the percentage stays pushed to the far edge of the row, away from the label, because `골목 70%` set flush together reads as "70% sure this is an alley" — the one claim the match cannot make. **Nothing on the screen now says what the number measures.** See [Known limitations](#known-limitations).

## Filling the gaps

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Template cards | `Functional` | The studio lists every template with how far the library gets through it (`4/6컷 있음 · 2컷 더`). A template the library cannot fill still appears — the shortfall is the invitation. **Ordered by shortfall, closest to filled first** (2026-08-12), with the shorter template and then the catalog breaking a tie: the row is a horizontal scroll that fits two cards and a sliver, so catalog order decided by luck which templates a user ever saw. Card width is set so the third card is cut by the screen edge — the row bleeds through the studio's own padding — because a card the edge cuts is the only signal that more exist. The row carried a `내 스냅 기준` caption until the same date; each card already prints the count that caption described. |
| Auto-match | `Functional` | Runs on open and again whenever the library changes, so a snap shot mid-session shows up without a refresh. Pure and unit-tested (`lib/match-template.ts`). |
| 지금 찍기 | `Functional` | Opens `/capture` and remembers which row asked. On return, if the library has a newer snap than it did on the way out, that snap goes into that row. Coming back without shooting leaves the row empty. The snap is filed in the library like any other — nothing about capture changes. |
| ✕ (drop) / 되돌리기 | `Functional` | Drops a proposed snap out of a slot, and puts it back. There is no "pick a different snap" — a wrong cut is cheaper to fix on the movie screen, after the movie exists. The control is an icon, not the word `빼기`: at two per row beside the reorder arrows, three Korean micro-labels outweighed the row's own content. |
| ⌃ ⌄ (reorder) | `Functional` | Swaps a snap with the one above or below it, so the cuts play in an order other than the one the clock proposed. The **slots** never move — `출발` stays the template's first scene — so a move trades the two snaps' positions. Held as a permutation of the match's proposal (`model/use-template-fill.ts`), which is what keeps each snap's confidence with it across a swap. |
| Rows that cannot be reordered | `Functional` | A row the user shot for, or dropped, is bound to its slot rather than to a position in the running order, so no swap could move it. Both arrows either side of such a row are drawn dimmed and inert rather than silently doing nothing. The arrows are also absent from an empty row, which has nothing to move. |
| 고친 것 되돌리기 | `Functional` | Puts every slot back the way the match proposed it, order included. Shown only once something has been dropped, shot, or reordered. |
| Nothing to propose | `Functional` | A library with no outing in it says so and leaves every slot empty with its `지금 찍기`. The screen is still useful — that is the case it was designed for. |
| 이대로 만들기 | `Functional` | Creates a movie from the filled slots in slot order, with the template's style and BGM, marked `arranger: 'ai'`, and replaces the screen with the movie — **an editable draft, not a running job**. Generation is slow remote work once a real backend runs it, so cut lengths, order, and style are settled on the movie screen first and the run starts there ([The movie screen](movie.md)). |
| Manual changes are not stored | `Functional` | Dropping and shooting are held on the screen. Nothing exists to write to until the movie is created, and leaving costs nothing. |
| One snap, one slot | `Functional` | A snap shot for an empty slot joins the library, so the next match would happily propose it for another slot as well. The slot it was shot for claims it, and the other one stays empty — a duplicate would have become two cuts of the same three seconds. |

## Ownership

- `src/entities/movie-template` owns the template model and the catalog (`lib/movie-template-catalog.ts`). It reaches `entities/movie` for `MovieStyle` through `entities/movie/@x/movie-template.ts` — a type-only cross-reference, which is the one case the [boundary rules](../conventions/module-boundaries.md#entity-cross-reference-exception-x) allow it.
- `src/features/fill-template` owns the match (`lib/match-template.ts`), the reason line (`lib/describe-match.ts`), the editable slot state (`model/use-template-fill.ts`), and the studio's readiness read-out (`model/use-template-offers.ts`). `describeSession` and the `TemplateFill.summary` it feeds have **no renderer** since the `AI가 고른 이유` panel was removed; both are still unit-tested and are kept for whatever surface takes the reason line next. Do not treat them as live behavior.
- `src/pages/movie-template` owns the screen, the slot row, and the camera round trip.
- `src/pages/studio/ui/template-panel.tsx` owns the cards on the studio.
- `src/features/compose-movie` owns `startMovieFromTemplate` and every rule about the movie it creates.
- `src/shared/lib/geo` is the distance helper — business-agnostic geometry, no snaps and no outings in it.

## Catalog policy

The catalog is four templates in a local constant, and that is the point. The recipe direction was set aside once (concept §3) because a catalog somebody has to keep running is a standing cost, and this is the version with none: the templates ship with the build and change when the build does. There is no seasonal content, no server, and no editorial calendar. If one is ever wanted, `GET /templates` replaces the catalog module and nothing else moves.

## Known limitations

- **No semantic matching.** A slot named 골목 is filled by the third snap of the outing, not by a picture of an alley. Real scene matching needs an on-device or server classifier and a snap-metadata pipeline that does not exist.
- **Nothing on the screen says the app has not looked at the pictures, and nothing says what `NN%` measures.** Two separate edits on 2026-08-03 removed the `AI가 고른 이유` panel and then the `같은 외출 확신` caption, and between them they took every word that explained the match. A first-time user now sees `골목`, a photo, and `70%`, whose most natural reading — "70% sure this is an alley" — is exactly the claim [What the match can and cannot do](#what-the-match-can-and-cannot-do) says the build must never make. Layout still separates the number from the label, which is not the same as saying so. **This is the one open issue on the screen**: it costs a single muted line under the header, and it should go back before the screen is shown to anyone who has not been told how the match works.
- Snaps captured before location was recorded have no coordinates, so an older library is matched on time alone and scores lower. Nothing is wrong with those snaps; the app is just less sure.
- Only one outing is ever proposed. There is no "다른 조합" and no way to match against a specific day.
- A slot cannot be filled from the library by hand — only by shooting, or by taking what the match proposed. Replacing a cut happens on the movie screen afterwards.
- Reordering is adjacent swaps only, and a shot or dropped row cannot take part in one at all. Moving a snap across a pinned row, or to a distant slot in one gesture, needs a different interaction than two arrows.
- The catalog is fixed at build time and templates cannot be created, edited, or reordered by the user.
- Nothing about a template is stored on the movie it makes, so a finished movie does not know which template it came from and cannot be re-matched.
