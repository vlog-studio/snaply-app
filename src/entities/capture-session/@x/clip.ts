// Cross-import surface for `entities/clip`. A clip's mood is intrinsic to the
// clip domain model and reuses the capture-session vocabulary, so the type is
// shared through this dedicated `@x` file rather than an unrelated Public API
// export (see docs/conventions/module-boundaries.md#entity-cross-reference).
export type { CaptureMood } from '../model/capture-options';
