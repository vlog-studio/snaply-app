# Incremental FSD adoption for the existing structure

## Migration status

The starter-structure migration was completed on 2026-07-15. The active source tree now follows the project FSD standard:

```text
src/
├── app/          # Expo Router adapters only
├── _app/         # Providers, routes, and global styles
├── pages/        # Product screens such as Home, Capture, Archive, and Settings
├── features/     # Reused user actions such as manage-recordings
├── entities/     # Reused product models such as the capture session
└── shared/       # Reusable, business-agnostic UI modules
```

The legacy `src/components`, `src/constants`, and `src/hooks` directories have been removed. Do not recreate them. Classify new code with the placement algorithm in [Feature-Sliced Design project standard](../architecture/feature-sliced-design.md).

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

## Completed migration stages

The stages below record how the starter structure was migrated. They remain useful when classifying similar starter code introduced by future upgrades.

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

## Post-migration rules

- `src/components`, `src/hooks`, and `src/constants` are no longer allowed transitional paths.
- Expo Router files under `src/app` must remain thin adapters to `_app` or `pages` Public APIs.
- Every new slice must expose an explicit, minimal Public API from its root `index.ts`.
- Add `widgets`, `features`, or `entities` only when current product code meets the reuse and responsibility criteria.
- If an Expo upgrade reintroduces starter files, classify them individually instead of restoring the legacy directory structure.

## Do not

- Create empty `widgets`, `features`, or `entities` directories merely to match the structure.
- Rewrite every file while moving it.
- Rename the entire `components` directory to `shared/ui` without classification.
- Move `hooks` to `shared/hooks` or `constants` to `shared/constants`.
- Preserve same-layer slice imports as permanent exceptions.
- Create the deprecated `processes` layer.

## Completion criteria

- [x] `src/app` contains only routes and Expo Router-special files.
- [x] `_app` composes global providers and initialization.
- [x] Screen implementations are separated into page slices.
- [x] Legacy `components`, `hooks`, and `constants` directories are removed.
- [x] Every slice has an explicit Public API.
- [x] No same-layer slice imports or deep imports remain.
- [x] Lint and typecheck pass.

## Sources

- [FSD migration from custom architecture](https://feature-sliced.design/docs/guides/migration/from-custom)
- [FSD incremental adoption](https://feature-sliced.design/docs/get-started/overview#incremental-adoption)
- [FSD desegmentation code smell](https://feature-sliced.design/docs/guides/issues/desegmented)
