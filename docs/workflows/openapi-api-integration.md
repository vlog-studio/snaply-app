# Integrating an OpenAPI/Swagger backend

This document records the agreed approach for consuming a separately developed backend that publishes an OpenAPI (Swagger) specification. It is a decision record and a setup procedure to follow **when the API layer is first introduced** — no API layer exists yet. TanStack Query v5 and Zod are installed but unused, and no `QueryClientProvider` exists (see [`state-and-data.md`](../frameworks/state-and-data.md)).

For where each piece of state and data code lives, read [`state-and-data.md`](../frameworks/state-and-data.md). For import direction and Public API rules that this procedure must obey, read [`module-boundaries.md`](../conventions/module-boundaries.md).

## Decision

Use **type-only code generation plus a hand-written client, query, and mapping layer**:

- Generate **types only** from the OpenAPI spec with [`openapi-typescript`](https://openapi-ts.dev/) (no runtime, no client code).
- Perform transport with [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/), a thin typed wrapper over `fetch` that consumes the generated types.
- Write Zod validation, domain mapping, `queryOptions` factories, and mutations **by hand**, placed in the owning FSD slice.

The generated artifact is confined to the `shared/api` type boundary; slice code (entity queries, domain mapping, feature mutations) stays hand-managed so it keeps obeying FSD rules. When the spec changes, regenerate the types; slice code is unaffected unless a contract it depends on actually changed.

### Why not full code generation

Tools such as `orval` or `@hey-api/openapi-ts` generate a client, TanStack Query hooks, and Zod schemas in one pass, but they fight this project's architecture:

- Output is a **flat generated folder** that ignores FSD slices (`entities` / `features` / `pages`).
- They **expose DTOs as app-wide types**, which [`state-and-data.md`](../frameworks/state-and-data.md) forbids ("Do not expose DTOs as if they were application-wide domain types").
- They generate their own query keys, **bypassing the `queryOptions` factory** convention.
- They group mutations mechanically with read queries instead of by user action.

The cost of the chosen approach is that `openapi-typescript` produces **no Zod schemas** — runtime validation for responses that need it is hand-written. That cost is accepted in exchange for keeping the FSD boundaries intact.

## Tooling

| Concern | Tool | Location |
| --- | --- | --- |
| DTO types | `openapi-typescript` (dev dependency, type-only output) | `src/shared/api/schema.d.ts` |
| Typed transport | `openapi-fetch` | `src/shared/api/client.ts` |
| DTO validation + domain mapping | Zod (hand-written) | `entities/<entity>/api` |
| Queries and mutations | TanStack Query `queryOptions` factories | `entities/<entity>/api`, `features/<action>` |
| QueryClient and provider | hand-written | `src/_app/providers` |

## Spec source of truth

Commit the spec file into the repository (for example `docs/api/openapi.json`) rather than generating from a live URL. The backend server does not need to be running to regenerate types, and every spec change lands as a reviewable diff. Add a generation script to `package.json`:

```json
"gen:api": "openapi-typescript docs/api/openapi.json -o src/shared/api/schema.d.ts"
```

Refresh the committed spec from the backend, run `npm run gen:api`, and commit both the spec and the regenerated `schema.d.ts` together.

## Generated types

- `src/shared/api/schema.d.ts` is a **generated artifact**: commit it, never edit it by hand.
- Reference the generated types **only** inside `shared/api/client.ts` and at the input boundary of each entity's `api` segment. Do not let a DTO type escape into `ui` or `model` — those see domain models only.

## Layered data flow

```text
openapi-fetch (DTO types)  →  entities/<e>/api: Zod parse + map  →  domain model
        [shared/api]                     [entities]                   [ui / model]
```

- **`shared/api`** encapsulates transport: base URL, the `Authorization` header, HTTP status handling, and transport-error normalization. Implement these as `openapi-fetch` middleware. It exposes a client, not DTOs.
- **`entities/<entity>/api`** calls the client, validates the response with Zod where validation is warranted, and maps the DTO to the domain model. Keep query keys and query functions together in a `queryOptions` factory (`<entity>.queries.ts`) as shown in [`state-and-data.md`](../frameworks/state-and-data.md).
- **`features/<action>`** owns mutations, including cache invalidation and optimistic updates. Place a mutation by the user action, not next to the read queries.
- **`pages/<page>/api`** holds a composite endpoint or a mutation meaningful to only one screen.

## QueryClient and provider

`src/_app/providers` owns the first `QueryClient`, the `QueryClientProvider`, and global retry/cache policy. Do not create a `QueryClient` singleton inside a feature or page.

## Authentication and error ownership

- Token injection (the `Authorization` header) and HTTP/transport error normalization live in `shared/api/client.ts` middleware.
- The **meaning** of a session token — which keys are stored and when they are cleared — belongs to the session domain, not to `shared`. Persist tokens through the `shared/lib/secure-storage` adapter, orchestrated by `entities/session` and a sign-in feature, per [`state-and-data.md`](../frameworks/state-and-data.md).

## Zod validation policy

`openapi-typescript` gives compile-time types but no runtime guarantees. Apply Zod at the entity `api` boundary for responses where a malformed payload would corrupt domain state or where the backend contract is not yet stable. Do not blanket-validate every field of every response; validate where a mapping or data-safety error would otherwise surface deep in the UI (see the error-placement table in [`state-and-data.md`](../frameworks/state-and-data.md)).

## Setup procedure

Follow this order when the API layer is first introduced:

1. Add `openapi-typescript` and `openapi-fetch` (client dependency) and the `gen:api` script.
2. Commit the spec to `docs/api/openapi.json` and run `npm run gen:api` to produce `src/shared/api/schema.d.ts`.
3. Create `src/shared/api/client.ts` (and its Public API `index.ts`): an `openapi-fetch` client with middleware for the base URL, auth header, and error normalization.
4. Introduce `QueryClient` and `QueryClientProvider` in `src/_app/providers`.
5. For each entity, add `entities/<entity>/api`: a request function that maps the DTO to a domain model (with Zod where warranted) and a `queryOptions` factory. Export only the domain contract from the slice `index.ts`.
6. Place mutations in the owning `features/<action>` or `pages/<page>/api`, including invalidation and optimistic updates.

## Open decisions to confirm before implementing

- **Spec source:** committed file (recommended) versus a live URL.
- **Entity list:** which business entities the first endpoints map to, so the `entities/<entity>/api` slices can be scaffolded.
- **Validation scope:** which responses warrant Zod validation rather than trusting the generated types.

## Sources

- [openapi-typescript](https://openapi-ts.dev/)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/)
- [FSD usage with TanStack Query](https://feature-sliced.design/docs/guides/tech/with-react-query)
