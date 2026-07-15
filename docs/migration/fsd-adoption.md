# Incremental FSD adoption for the existing structure

## Current state

At the time of writing, this project is close to the Expo SDK 57 starter and uses the following legacy technical directories:

```text
src/
├── app/
├── components/
├── constants/
└── hooks/
```

Do not move every existing file at once. Use the target structure for new product functionality, and migrate existing starter code when it is actually modified. Do not mix a large architecture-only move with feature changes in one pull request.

## Target

```text
src/
├── app/          # Expo Router adapter only
├── _app/
├── pages/
├── widgets/      # Only when needed
├── features/     # Only when needed
├── entities/     # Only when needed
└── shared/
```

## Migration stages

### 1. Separate routes from screens

Move the actual UI from `src/app/index.tsx` and `src/app/explore.tsx` into their respective page slices, leaving only re-exports in the route files.

```text
src/pages/home/
├── ui/home-page.tsx
└── index.ts

src/app/index.tsx
```

Do not allow pages to import one another. If common code emerges, reclassify it by its actual meaning and usage scope.

### 2. Separate the App layer

Move theme, splash, and tab composition from the current `src/app/_layout.tsx` into `src/_app/routes` and `src/_app/providers`. Leave only a re-export of the `_app` Public API in the Router `_layout.tsx`.

### 3. Dissolve legacy technical directories by usage

Classify each existing file individually.

| Existing path or example | Possible target | Decision criterion |
| --- | --- | --- |
| `src/components/themed-text.tsx` | `shared/ui/themed-text` | Generic UI without business logic |
| `src/components/ui/collapsible.tsx` | Page-local or `shared/ui/collapsible` | Confirm whether multiple screens actually use it |
| `src/components/app-tabs*` | `_app/routes`, widget, or shared UI | Separate navigation composition from presentation |
| `src/hooks/use-theme.ts` | `shared/ui/theme` or `_app/providers` | Separate consumer API from provider responsibility |
| `src/constants/theme.ts` | `shared/config/theme` or `shared/ui/theme` | Do not preserve a generic global collection |

This table is not a mandatory file-move list. When changing a file, inspect its actual consumers and select its final location accordingly.

### 4. Reduce Shared again

Shared may grow during the initial migration. Move code used by one page back into that page, and review code with emerging product meaning as an entity or feature candidate.

- `shared/ui`: reusable UI without business logic
- `shared/lib`: one directory per focused library
- `shared/api`: transport and generic controller clients
- `shared/config`: app-wide environment and configuration

### 5. Extract domains only after reuse is established

Create entities, features, and widgets based on code actually reused by more than one page. Do not pre-classify every starter component into a layer based only on its name.

## Allowed transitional state

- `src/components`, `src/hooks`, and `src/constants` may temporarily coexist with new FSD layers.
- Existing files may remain in legacy paths until they are modified.
- Do not add new files to legacy directories.
- A new FSD slice may temporarily import a legacy module, but legacy code must not deep-import internals from a new higher layer.
- Add a TODO with a clear removal condition or a work-tracking link for temporary dependencies.

## Do not

- Create empty `widgets`, `features`, or `entities` directories merely to match the structure.
- Rewrite every file while moving it.
- Rename the entire `components` directory to `shared/ui` without classification.
- Move `hooks` to `shared/hooks` or `constants` to `shared/constants`.
- Preserve same-layer slice imports as permanent exceptions.
- Create the deprecated `processes` layer.

## Completion criteria

- `src/app` contains only routes and Expo Router-special files.
- `_app` composes global providers and initialization.
- Screen implementations are separated into page slices.
- Legacy `components`, `hooks`, and `constants` directories are removed.
- Every slice has an explicit Public API.
- No same-layer slice imports or deep imports remain.
- Lint and typecheck pass.

## Sources

- [FSD migration from custom architecture](https://feature-sliced.design/docs/guides/migration/from-custom)
- [FSD incremental adoption](https://feature-sliced.design/docs/get-started/overview#incremental-adoption)
- [FSD desegmentation code smell](https://feature-sliced.design/docs/guides/issues/desegmented)
