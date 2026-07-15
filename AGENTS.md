# Agent documentation index

This file is an index of task-specific documentation, not the full body of the project rules. Before making changes, read the applicable documents from the table below. If a task spans multiple categories, apply all relevant documents.

| Task category | Required document | Scope |
| --- | --- | --- |
| Any change to code under `src` | [`docs/architecture/feature-sliced-design.md`](docs/architecture/feature-sliced-design.md) | FSD v2.1 layers, slices, segments, dependency principles, and the project-standard structure |
| Imports, exports, and new modules or slices | [`docs/conventions/module-boundaries.md`](docs/conventions/module-boundaries.md) | Public APIs, import direction, circular dependencies, and naming rules |
| Expo Router, layouts, navigation, providers, and platform variants | [`docs/frameworks/expo-router.md`](docs/frameworks/expo-router.md) | Integration rules for Expo SDK 57 and FSD |
| APIs, TanStack Query, Zustand, forms, and persistent storage | [`docs/frameworks/state-and-data.md`](docs/frameworks/state-and-data.md) | Placement rules for state and data code |
| New features, refactoring, and code review | [`docs/workflows/feature-development.md`](docs/workflows/feature-development.md) | Classification order, implementation workflow, and completion checklist |
| Cleanup of existing `components`, `hooks`, and `constants` | [`docs/migration/fsd-adoption.md`](docs/migration/fsd-adoption.md) | Incremental migration order and transitional-state rules |

## Documentation language

Write all documentation intended for agents in English. This includes `AGENTS.md` and every guide indexed by it. Preserve code identifiers and product terms where translation would change their technical meaning.

## Rule precedence

1. The user's current request
2. Project documentation linked from this index
3. Official, version-specific documentation
4. General framework conventions

If documentation and implementation diverge, do not spread an undocumented exception. Update the relevant documentation with the implementation or report the discrepancy.

## External sources of truth

- Before writing Expo code, read the relevant API page in the [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/). Do not rely on the latest-version documentation or memory.
- Base FSD decisions on the [official Feature-Sliced Design v2.1 documentation](https://feature-sliced.design/docs/get-started/overview). Do not apply older material that uses the deprecated `processes` layer.
