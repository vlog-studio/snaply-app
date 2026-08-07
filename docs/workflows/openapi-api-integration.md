# Integrating an OpenAPI/Swagger backend

This document records the approach for consuming the separately developed Snaply backend, which publishes an OpenAPI (Swagger) specification. The API layer exists: `src/shared/api` owns the transport (`apiRequest`), `_app/providers` owns the `QueryClient`, and the first entity/feature slices consume them (see [`state-and-data.md`](../frameworks/state-and-data.md)).

For where each piece of state and data code lives, read [`state-and-data.md`](../frameworks/state-and-data.md). For import direction and Public API rules, read [`module-boundaries.md`](../conventions/module-boundaries.md).

## Decision

Use **type-only code generation plus a hand-written client, query, and mapping layer**:

- Generate **types only** from the OpenAPI spec with [`openapi-typescript`](https://openapi-ts.dev/) (no runtime, no client code).
- Perform transport with the hand-written `apiRequest` in `src/shared/api/client.ts` — a thin `fetch` wrapper that owns the base URL, Supabase JWT injection, the backend's response envelope, and `ApiError` normalization.
- Write Zod validation, domain mapping, `queryOptions` factories, and mutations **by hand**, placed in the owning FSD slice.

The generated artifact is confined to the `shared/api` type boundary; slice code (entity queries, domain mapping, feature mutations) stays hand-managed so it keeps obeying FSD rules. When the spec changes, regenerate the types; slice code is unaffected unless a contract it depends on actually changed.

### Why not `openapi-fetch` (2026-08-07 amendment)

The original plan was to transport with [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/). Two facts of the actual backend made it a poor fit, verified against the live server:

- The spec defines **no response schemas** — every response is a bare "Default Response". `openapi-fetch`'s value is compile-time response typing, and with this spec it would type every response body as `never`. Zod at the entity boundary is the real response contract either way.
- Every endpoint wraps its payload in a `{ success: true, data }` / `{ success: false, error: { code, message } }` envelope. `apiRequest` unwraps and normalizes it once; with `openapi-fetch` the envelope would still need hand-written handling on top.

What the generated types do provide today — endpoint paths, methods, request bodies, query parameters — is consumed as types: `apiRequest` accepts only an `ApiPath` (a path present in the spec) or a `ResolvedApiPath` produced by the `apiPath()` placeholder-substitution helper, so a typo'd or removed endpoint is a compile error. **Revisit `openapi-fetch` if the backend starts publishing response schemas**; the migration would be contained to `shared/api`.

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
| Endpoint/request types | `openapi-typescript` (dev dependency, type-only output) | `src/shared/api/schema.d.ts` |
| Typed endpoint paths | `ApiPath` / `apiPath()` over the generated `paths` | `src/shared/api/paths.ts` |
| Transport | hand-written `apiRequest` (`fetch` + envelope + `ApiError`) | `src/shared/api/client.ts` |
| DTO validation + domain mapping | Zod (hand-written) | `entities/<entity>/api` |
| Queries and mutations | TanStack Query `queryOptions` factories | `entities/<entity>/api`, `features/<action>` |
| QueryClient and provider | hand-written | `src/_app/providers` |

`openapi-typescript` declares a `typescript@^5.x` peer while this project uses TypeScript 6; a `package.json` `overrides` entry pins its peer to the root `typescript` so plain `npm install` resolves. Do not install with `--legacy-peer-deps` — it silently drops other packages' auto-installed peers (this broke `jest-expo` once).

## Spec source of truth

Commit the spec file into the repository at `docs/api/openapi.json` rather than generating from a live URL. The backend server does not need to be running to regenerate types, and every spec change lands as a reviewable diff. Two `package.json` scripts implement this:

- `npm run api:pull` (`scripts/pull-api-spec.sh`) refreshes the committed spec from the backend's live Swagger JSON endpoint at `${EXPO_PUBLIC_API_BASE_URL}/docs/json`. The origin comes from `.env` — the same `EXPO_PUBLIC_API_BASE_URL` the app uses at runtime, so there is a single place to update when the backend moves (currently the backend developer's laptop on the local network; later a shared dev server).
- `npm run api:gen` regenerates `src/shared/api/schema.d.ts` from the committed spec.

When the backend contract changes, run `npm run api:pull && npm run api:gen` and commit the spec and the regenerated `schema.d.ts` together.

The edit-progress WebSocket (`/edit-jobs/:id/progress`) is not representable in OpenAPI; its contract lives in the backend repository's `docs/api-spec.md`.

## Generated types

- `src/shared/api/schema.d.ts` is a **generated artifact**: commit it, never edit it by hand.
- Reference the generated types **only** inside `shared/api` and at the input boundary of each entity's `api` segment. Do not let a DTO type escape into `ui` or `model` — those see domain models only.

## Layered data flow

```text
apiRequest (typed paths)  →  entities/<e>/api: Zod parse + map  →  domain model
       [shared/api]                   [entities]                    [ui / model]
```

- **`shared/api`** encapsulates transport: base URL, the `Authorization` header, the response envelope, HTTP status handling, and transport-error normalization into `ApiError`. It exposes `apiRequest`/`apiPath`, not DTOs.
- **`entities/<entity>/api`** calls the client, validates the response with Zod where validation is warranted, and maps the DTO to the domain model. Keep query keys and query functions together in a `queryOptions` factory (`<entity>.queries.ts`) as shown in [`state-and-data.md`](../frameworks/state-and-data.md).
- **`features/<action>`** owns mutations, including cache invalidation and optimistic updates. Place a mutation by the user action, not next to the read queries.
- **`pages/<page>/api`** holds a composite endpoint or a mutation meaningful to only one screen.

## QueryClient and provider

`src/_app/providers` owns the first `QueryClient`, the `QueryClientProvider`, and global retry/cache policy. Do not create a `QueryClient` singleton inside a feature or page.

## Authentication and error ownership

- Token injection (the Supabase JWT `Authorization` header) and HTTP/transport error normalization live in `shared/api/client.ts`.
- The **meaning** of a session token — which keys are stored and when they are cleared — belongs to the session domain, not to `shared`. Persist tokens through the `shared/lib/secure-storage` adapter, orchestrated by `entities/session` and a sign-in feature, per [`state-and-data.md`](../frameworks/state-and-data.md).

## Zod validation policy

`openapi-typescript` gives compile-time types but no runtime guarantees — and this backend publishes no response schemas at all, so Zod at the entity `api` boundary is the only response contract. Every `apiRequest` call requires a schema for the envelope's `data`. Keep schemas focused on the fields the app actually consumes; do not blanket-validate every field of every response (see the error-placement table in [`state-and-data.md`](../frameworks/state-and-data.md)).

## Setup procedure

The original six-step introduction plan, with current status:

1. ✅ `openapi-typescript` dev dependency and the `api:pull`/`api:gen` scripts (`openapi-fetch` was added, then dropped — see the 2026-08-07 amendment).
2. ✅ Spec committed at `docs/api/openapi.json`; `npm run api:gen` produces `src/shared/api/schema.d.ts`.
3. ✅ `src/shared/api`: `apiRequest` transport, `ApiError`, `apiPath`, Public API `index.ts`.
4. ✅ `QueryClient` and `QueryClientProvider` in `src/_app/providers`.
5. 🔄 Entity `api` segments: `entities/location/api` exists (DTO schema + mapper + mock routing via `USE_MOCK_API`); the remaining entities (video, edit-job, profile, subscription, SNS connection) are added as their features land.
6. 🔄 Mutations in the owning `features/<action>` or `pages/<page>/api`: `features/geofence-monitor` and `features/register-push-token` exist; the rest follow their features.

## Open decisions to confirm before implementing

- ~~**Spec source:**~~ decided 2026-08-07: committed file, refreshed via the `api:pull` script (see "Spec source of truth").
- ~~**Transport:**~~ decided 2026-08-07: hand-written `apiRequest`; `openapi-fetch` deferred until the backend publishes response schemas.
- **Entity list:** which business entities the remaining endpoints map to, so the `entities/<entity>/api` slices can be scaffolded.
- **Validation scope:** which responses warrant field-level Zod strictness beyond the fields the app consumes.

## Sources

- [openapi-typescript](https://openapi-ts.dev/)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/)
- [FSD usage with TanStack Query](https://feature-sliced.design/docs/guides/tech/with-react-query)
