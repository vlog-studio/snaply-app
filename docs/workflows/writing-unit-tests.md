# Writing unit tests

This document defines how to author automated tests in this project. For the commands that run the suite on CI and locally, and for the boundary between JavaScript tests and on-device verification, read [`local-development-and-testing.md`](local-development-and-testing.md). This document covers what to test, where a test file lives, and which pattern to apply for each kind of module.

## Tooling

- **Runner:** [`jest`](https://jestjs.io) with the [`jest-expo`](https://docs.expo.dev/develop/unit-testing/) preset (configured in [`jest.config.js`](../../jest.config.js)). The preset provides the React Native transform and mocks for most Expo native modules. [`jest.setup.js`](../../jest.setup.js) runs before each suite; it materializes Expo's lazy `fetch` global so its native-logger warning cannot fire during a later suite's teardown and fail `test:ci`. Leave it in place.
- **Rendering and interaction:** [`@testing-library/react-native`](https://callstack.github.io/react-native-testing-library/) (RNTL) v14 — `render`, `screen`, `fireEvent`, `renderHook`, `act`, and `waitFor`. **`render` and `renderHook` are asynchronous in v14 — always `await` them**, or `result` is a pending promise and `result.current` reads as `undefined`.
- **Path alias:** `@/…` resolves to `src/…` (and `@/assets/…` to `assets/…`) in tests via `moduleNameMapper`, so tests use the same import specifiers as production code.
- **TypeScript:** every test is a `.ts`/`.tsx` file and must pass `npm run typecheck`. Jest globals are available because `tsconfig.json` includes `"jest"` in `types`.

## What to test

Prioritize modules that hold decision logic or a user-facing contract. In rough priority order:

1. **Pure functions** — normalizers, formatters, validators, and mappers (for example `entities/capture-session/model/capture-options.ts`, `features/manage-recordings/lib/format-recording.ts`). Highest value, lowest cost; always test these.
2. **Data-safety and adapter logic** — code that filters, sorts, or guards side effects (for example the "only Snaply recordings can be deleted" guard in `shared/lib/recording-files`). Test the branch logic even when the underlying native API must be mocked.
3. **Hooks and stores** — state machines, optimistic updates, and the exact user-facing messages they surface (for example `features/manage-recordings/model/use-local-recordings.ts`, `shared/ui/theme/theme-mode.ts`).
4. **Component interaction contracts** — the accessibility role, the rendered label, and the callback wiring that a consumer depends on (for example `shared/ui/snaply-button`). Assert behavior, not styling.

Do **not** write JavaScript tests for:

- Styling values, layout numbers, or theme color hex codes — these are verified visually on the iOS Simulator and Android emulator.
- Native behavior: camera, permissions, real file-system access, animation timing, haptics, media playback. These require on-device verification (see [`local-development-and-testing.md`](local-development-and-testing.md)); a passing mock-based test does not prove them.
- Route files under `src/app` and thin `index.ts` Public API barrels, which contain no logic of their own. Test the slice modules they re-export instead.

## Where a test lives

Co-locate every test with the module it verifies, inside the same FSD segment, using the `.test.ts`/`.test.tsx` suffix:

```text
src/features/manage-recordings/lib/format-recording.ts
src/features/manage-recordings/lib/format-recording.test.ts
```

Co-location keeps FSD ownership explicit and lets a slice move as one unit. A test imports the module under test through a **relative path** (`./format-recording`), exactly as sibling files inside the slice do. It imports anything from another slice through that slice's `@/…` Public API, never a deep path — the module-boundary rules in [`module-boundaries.md`](../conventions/module-boundaries.md) apply to test files too. Do not add a test to the slice's `index.ts` barrel.

## Conventions

- **Describe the module, name the behavior.** The top-level `describe` names the unit (`describe('useLocalRecordings', …)`); each `it` states an observable behavior in plain language (`it('prepends a saved recording and returns it', …)`).
- **Assert behavior, not implementation.** Query by role and accessible name (`screen.getByRole('button', { name })`); check returned values and rendered output rather than internal calls, except when the side effect *is* the contract (a delete call, an analytics event).
- **Table-driven cases.** Use `it.each` for a family of inputs that exercise the same rule (supported vs. fallback values, each variant of an enum). This is the established style — follow it instead of copy-pasting near-identical `it` blocks.
- **Korean strings as escapes.** Assertions against Korean user-facing copy are written with `\uXXXX` escape sequences so the source stays ASCII-only and diffs stay stable. Match the existing tests:

  ```ts
  const buttonTitle = '촬영 시작'; // 촬영 시작
  ```

  Prefer asserting a message the module owns over re-typing long strings; when a literal is unavoidable, escape it.
- **Reset shared state.** Call `jest.clearAllMocks()` in `beforeEach`, and reset module-level singletons (Zustand stores, in-memory registries) between tests so ordering never matters.

## Patterns by module kind

### Pure functions

Import the function and assert input/output directly. No React, no mocks.

```ts
import { normalizeCaptureDuration } from './capture-options';

it.each([undefined, '', '3', '05'])('falls back to three seconds for %s', (value) => {
  expect(normalizeCaptureDuration(value)).toBe(3);
});
```

### Components (RNTL)

Render, drive the interaction with `fireEvent`, and assert the observable result. Query by accessibility role and name.

```tsx
const onPress = jest.fn();
await render(<SnaplyButton title={title} onPress={onPress} />);
fireEvent.press(screen.getByRole('button', { name: title }));
expect(onPress).toHaveBeenCalledTimes(1);
```

### Hooks

Drive a hook with `await renderHook`; wrap state updates in `await act(async …)` and wait for asynchronous transitions with `waitFor`. Mock the hook's slice dependencies at their Public API so the test stays inside one slice.

```ts
jest.mock('@/shared/lib/recording-files', () => ({
  listLocalRecordings: jest.fn(),
  persistLocalRecording: jest.fn(),
  deleteLocalRecording: jest.fn(),
}));

const { result } = await renderHook(() => useLocalRecordings());
await waitFor(() => expect(result.current.isLoading).toBe(false));
await act(async () => {
  await result.current.saveRecording('file:///tmp/clip.mov');
});
```

### Zustand stores

A store is a module-level singleton. Exercise it through its exported hooks with `renderHook` + `act`, and reset it to its default in `afterEach` so tests stay independent. Mock the persistence backend so no native storage is touched.

```ts
jest.mock('@/shared/lib/secure-storage', () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));
```

### Mocking Expo and native modules

The `jest-expo` preset mocks many Expo modules already; add a `jest.mock` factory only when a test needs to control return values or when the module exposes a class-based API the preset does not cover.

- **Class-based APIs (e.g. `expo-file-system`).** Provide real mock classes so `instanceof` checks in the module under test still work, and back them with a shared in-memory registry each test seeds. See `shared/lib/recording-files/recording-files.test.ts` for the reference implementation.
- **Slice dependencies.** Prefer mocking another slice's Public API (`@/shared/lib/…`) over reaching for its internal native module — it keeps the test at the boundary the production code uses.
- **`react-native` exports.** Do **not** `jest.requireActual('react-native')` — under jest-expo it eagerly loads the full RN index and trips native TurboModule invariants. Instead provide a minimal manual factory listing only the exports the module graph under test actually touches:

  ```ts
  jest.mock('react-native', () => ({
    useColorScheme: jest.fn(),
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  }));
  ```

## Before you finish

Run the JavaScript quality gates and confirm they pass:

```bash
npm run test:ci
npm run typecheck
npm run lint
```

Use `npm test` for watch mode while iterating. A new user-visible behavior is not complete until it is covered by a test at the appropriate level and the affected document under `docs/features` is updated in the same change (see [`feature-development.md`](feature-development.md)).
