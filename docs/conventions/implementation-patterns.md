# Implementation patterns

A cookbook of the recurring, copy-followable patterns already implemented in this
codebase. Where the other convention documents state *rules*
([module boundaries](./module-boundaries.md), [SOLID](./solid-react-native.md)) and
*placement* ([state and data](../frameworks/state-and-data.md)), this document points
to the *canonical implementation* to imitate for each common task, so a new slice
looks like the existing ones.

Each pattern lists **when to use it**, the **canonical file(s)** to read first, a
**skeleton** to adapt, and **rules** (including what not to do).

## How to use this document

- Adding a screen → §1, §14.
- Reading data from the backend → §2, §3, §4 (in that order), consumed via §5-adjacent code.
- Writing data / firing a server action → §5.
- Sharing client state across components → §7, §8.
- Swapping an external dependency (auth, storage) behind an interface → §9.
- Orchestrating a user action with pending/error state → §10.
- Loading/mutating a device-local resource → §11.
- Wrapping a device/native API or supporting web → §12, §13.
- Consuming the design system in UI → §14.
- Testing any of the above → §15.

## Reading the skeletons: they are starting points, not contracts

The skeletons below capture the **shape and the responsibility split** of each pattern —
which concern lives in which file, what crosses a boundary, what stays internal. Copy
the structure; the exact lines are illustrative. `/* ... */` marks bodies you fill in.

### When to deviate

Prefer the skeleton, but **bypass it** when any of the following holds — deviating is
the correct call, not a violation:

1. **The dependency's official, version-specific docs prescribe a different API or
   shape.** These skeletons can lag an SDK. Per [rule precedence](../../AGENTS.md#rule-precedence),
   official version-specific docs outrank this document. Before writing Expo code, read
   the relevant [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) page; base
   TanStack Query / Zustand / Zod usage on their current docs, not on the snippet here.
2. **The skeleton is impossible or clearly inefficient for the case.** Pagination,
   streaming/SSE, batched or composite endpoints, cursor caches, optimistic mutation
   rollback, and similar cases legitimately need a different structure.
3. **Forcing the pattern would create a premature or wrong abstraction.** If the
   product shape does not actually match the pattern, do not bend it to fit — see
   [feature development §3](../workflows/feature-development.md) ("extract only with evidence").

### How to deviate responsibly

- **Preserve the invariant, not the syntax.** Keep the responsibility boundaries
  (transport ≠ mapping ≠ query key ≠ product flow) and the Public-API boundaries even
  when the code shape differs. That is what makes a slice recognizable, not the literal
  skeleton.
- **One-off deviation:** leave a short comment at the site explaining why the standard
  shape did not fit.
- **New recurring shape:** update this document (adjust or add a pattern) rather than
  silently spreading an undocumented exception, per
  [AGENTS "If documentation and implementation diverge"](../../AGENTS.md#rule-precedence).

### What is *not* a skeleton you may bypass

The [module-boundary rules](./module-boundaries.md), the FSD layer import direction,
and the [cross-cutting principles](#cross-cutting-principles-these-patterns-share) at
the end of this document are **rules**, not illustrative skeletons. Changing them needs
the escalation path in [feature development](../workflows/feature-development.md)
(move orchestration up a layer) or a documented architecture exception — not an inline
bypass.

---

## 1. Thin route adapter

**When:** every file under `src/app`. Routes wire a URL to a page; they hold no logic.

**Canonical:** [`src/app/(tabs)/index.tsx`](../../src/app/(tabs)/index.tsx),
[`src/app/roll/[id].tsx`](../../src/app/roll/[id].tsx).

```ts
// src/app/(tabs)/index.tsx — the common case: re-export the page Public API
export { HomePage as default } from '@/pages/home';
```

```tsx
// src/app/roll/[id].tsx — thin adapter variant: read params, pass as explicit props
import { useLocalSearchParams } from 'expo-router';

import { RollDetailPage } from '@/pages/roll-detail';

export default function RollDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <RollDetailPage rollId={typeof id === 'string' ? id : undefined} />;
}
```

**Rules**
- Re-export a page Public API as `default`, or wrap it in a thin adapter that only reads
  route params and passes them as explicit props.
- No business logic, no reusable components, no data fetching in `src/app`.
- A route adapter imports only the Public API of `_app` or `pages` (see
  [module boundaries](./module-boundaries.md), [expo-router](../frameworks/expo-router.md)).

---

## 2. Layered data flow (transport → DTO → fetch → query factory → consumer)

**When:** reading any business resource from the backend. This is the backbone pattern;
§3–§5 are its parts.

**Canonical:** the four files of `entities/location/api`
([`location.dto.ts`](../../src/entities/location/api/location.dto.ts),
[`get-locations.ts`](../../src/entities/location/api/get-locations.ts),
[`location.queries.ts`](../../src/entities/location/api/location.queries.ts)),
the shared transport [`shared/api/client.ts`](../../src/shared/api/client.ts), and a
consumer [`use-geofence-monitoring.ts`](../../src/features/geofence-monitor/model/use-geofence-monitoring.ts).

Responsibilities, one per file:

| File | Owns | Knows domain models? |
| --- | --- | --- |
| `shared/api/client.ts` | HTTP transport: URL/query, JWT, envelope, `ApiError` | No |
| `<entity>/api/<entity>.dto.ts` | wire (snake_case) Zod schema + mapper to domain | Maps to it |
| `<entity>/api/get-<entity>.ts` | calls `apiRequest`, maps DTO → domain | Returns it |
| `<entity>/api/<entity>.queries.ts` | `queryOptions` key + fn factory | Via the fetch fn |
| consumer (`model`/`ui`) | `useQuery`/`fetchQuery` with the factory | Domain type only |

Consumption — imperative (as in the canonical feature) or via `useQuery` in a component:

```ts
// imperative, from an effect/orchestrator (see use-geofence-monitoring.ts)
const locations = await queryClient.fetchQuery(locationQueries.nearby(origin));

// declarative, from a component
const { data, isPending, error } = useQuery(locationQueries.nearby(origin));
```

**Rules**
- Keep these responsibilities in separate files. Do not fetch-and-map inside a
  component, and do not let the transport client import a domain type.
- The consumer receives the mapped **domain** type and passes the query `signal`
  through the factory (§4). `QueryClient` is owned by `_app/providers`; never construct
  one in a feature/page.
- Place the query in `entities/<entity>/api` for a single entity, or `pages/<page>/api`
  for a screen-only composite (see [state and data](../frameworks/state-and-data.md#query-and-key-placement)).

---

## 3. DTO schema + mapper (wire shape never leaks)

**When:** any endpoint whose JSON differs from the domain model (here: snake_case wire
vs. camelCase domain).

**Canonical:** [`location.dto.ts`](../../src/entities/location/api/location.dto.ts).

```ts
import { z } from 'zod';

import type { Location } from '../model/location';

export const locationDtoSchema = z.object({
  id: z.string(),
  radius_meters: z.number().int(),
  message_template: z.string(),
  // ...remaining wire fields
});
export type LocationDto = z.infer<typeof locationDtoSchema>;
export const locationsDtoSchema = z.array(locationDtoSchema);

export function mapLocation(dto: LocationDto): Location {
  return {
    id: dto.id,
    radiusMeters: dto.radius_meters,
    messageTemplate: dto.message_template,
    // ...
  };
}
```

**Rules**
- Validate with Zod at the transport boundary; infer the DTO type (`z.infer`) — never
  hand-declare it twice.
- The mapper is the only place the wire shape (snake_case, etc.) exists. DTO field names
  must not appear anywhere else in the app.
- Do not export the DTO type from the slice Public API — it is an internal wire detail.

---

## 4. Query key + options factory

**When:** every read query, so cache keys stay consistent for caching and invalidation.

**Canonical:** [`location.queries.ts`](../../src/entities/location/api/location.queries.ts).

```ts
import { queryOptions } from '@tanstack/react-query';

import { getLocations, type GetLocationsParams } from './get-locations';

export const locationQueries = {
  all: () => ['location'] as const,
  nearby: (params: GetLocationsParams) =>
    queryOptions({
      queryKey: [...locationQueries.all(), 'nearby', params.latitude, params.longitude] as const,
      queryFn: ({ signal }) => getLocations(params, signal),
    }),
};
```

**Rules**
- Build keys from a shared `all()` root so invalidation can target the whole entity.
- Forward the TanStack `signal` into the fetch function for cancellation.
- Never hand-write raw key arrays in UI or mutation code — go through the factory.

---

## 5. Mock-or-real request routing (`USE_MOCK_API`)

**When:** any request to a backend endpoint that does not exist yet (the current
default: the app runs against in-code mocks until an origin is configured).

**Canonical (three identical instances):**
[`get-locations.ts`](../../src/entities/location/api/get-locations.ts),
[`register-fcm-token.ts`](../../src/features/register-push-token/api/register-fcm-token.ts),
[`report-geofence-enter.ts`](../../src/features/geofence-monitor/api/report-geofence-enter.ts).
Config: [`shared/config/api.ts`](../../src/shared/config/api.ts).

```ts
import { apiRequest } from '@/shared/api';
import { USE_MOCK_API } from '@/shared/config/api';

import type { X } from '../model/x';
import { xDtoSchema, mapX } from './x.dto';
import { mockXDtos } from './mock-x';

async function getXFromApi(params: GetXParams, signal?: AbortSignal): Promise<X[]> {
  const dtos = await apiRequest('/x', { method: 'GET', query: { /* ... */ }, schema: xDtoSchema, signal });
  return dtos.map(mapX);
}

// Same return type as the API branch, so callers never see the mode.
function getXMock(): Promise<X[]> {
  if (__DEV__) console.log('[x][mock] ...'); // never log secrets (tokens, credentials)
  return Promise.resolve(mockXDtos.map(mapX));
}

export function getX(params: GetXParams, signal?: AbortSignal): Promise<X[]> {
  return USE_MOCK_API ? getXMock() : getXFromApi(params, signal);
}
```

For a write whose response body is unused, validate permissively:

```ts
await apiRequest('/auth/fcm-token', { method: 'POST', body: { fcmToken }, schema: z.unknown(), signal });
```

**Rules**
- The mock and real branches must have an **identical return type** so callers never
  branch on the mode.
- Never log sensitive values (FCM tokens, credentials); log only that the call ran.
- Leave a comment describing how the mock is replaced once the real endpoint exists.

---

## 6. Normalized transport error + response envelope

**When:** always — it is built into `apiRequest`. Understand it before adding error
handling in a feature.

**Canonical:** [`shared/api/client.ts`](../../src/shared/api/client.ts),
[`shared/api/api-error.ts`](../../src/shared/api/api-error.ts).

Every endpoint returns one envelope; every failure funneled through `apiRequest` throws
one `ApiError` (stable machine-readable `code` + user-safe `message`):

```ts
type ApiEnvelope =
  | { success: true; data: unknown }
  | { success: false; error?: { code?: string; message?: string } };

// Caller reasons about a single error shape:
try {
  await getX(params);
} catch (error) {
  if (error instanceof ApiError && error.code === 'network_error') {
    /* feature-level retry/copy */
  }
}
```

**Rules**
- Transport/protocol error normalization lives only in `shared/api`.
- Business errors (missing entity, mapping) belong to the entity/page `api`; action
  failure and retry belong to the feature; screen-wide error UI belongs to the page
  (see [state and data](../frameworks/state-and-data.md#error-and-loading-states)).

---

## 7. Zustand slice: single writer + focused selector hooks

**When:** client state shared by multiple components within a slice.

**Canonical:** [`session-store.ts`](../../src/entities/session/model/session-store.ts),
exposed via [`entities/session/index.ts`](../../src/entities/session/index.ts).

```ts
// model/x-store.ts
import { create } from 'zustand';

type XState = { value: T | null; hasHydrated: boolean };

// Exported for co-located tests only; app code uses the selector hooks below.
export const useXStore = create<XState>()(() => ({ value: null, hasHydrated: false }));

// One authoritative writer per source of change (subscribe once from the root layout).
export function initX(): () => void {
  /* subscribe to the external source, setState on change, return cleanup */
}

// Focused selector hooks are the public surface.
export function useXValue(): T | null {
  return useXStore((state) => state.value);
}
```

```ts
// index.ts — export the hooks and the initializer, not the raw store
export { initX, useXValue } from './model/x-store';
```

**Rules**
- Export **focused selector hooks**, not the raw store, from the slice Public API. The
  raw `useXStore` is exported for co-located tests only.
- Concentrate writes: one function is the authoritative writer for a given source.
  Expose domain actions, not a bag of setters.
- Components subscribe through selectors, never to the whole store.

---

## 8. Persisted Zustand slice (SecureStore-backed)

**When:** client state that must survive relaunch (settings, preferences).

**Canonical:** [`notification-settings-store.ts`](../../src/features/notification-settings/model/notification-settings-store.ts).

```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { secureStorage } from '@/shared/lib/secure-storage';

const useXStore = create<XState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }), // domain actions, not raw setters
    }),
    { name: 'snaply.x-settings', storage: createJSONStorage(() => secureStorage) },
  ),
);
```

**Rules**
- Namespace the `persist` key with the `snaply.` prefix.
- Back persistence with the `secureStorage` adapter, not `AsyncStorage` directly.
- If the state mirrors a future backend field, document how it becomes a server query
  once the endpoint exists (see the file's header comment).

---

## 9. Dependency inversion for a swappable external service

**When:** a feature depends on an external service (auth, payment, BaaS) that must be
mockable or replaceable without touching screens.

**Canonical:** [`auth-provider.ts`](../../src/features/sign-in/model/auth-provider.ts)
(interface), [`mock-auth-provider.ts`](../../src/features/sign-in/model/mock-auth-provider.ts) /
[`supabase-auth-provider.ts`](../../src/features/sign-in/model/supabase-auth-provider.ts)
(implementations), selected in [`use-sign-in.ts`](../../src/features/sign-in/model/use-sign-in.ts).

```ts
// model/auth-provider.ts — the seam
export interface AuthProvider {
  signIn(provider: SocialProvider): Promise<User>;
}

// model/use-sign-in.ts — select the concrete impl once, behind a runtime condition
const authProvider: AuthProvider =
  __DEV__ && !isSupabaseConfigured ? mockAuthProvider : supabaseAuthProvider;
```

**Rules**
- Depend on the interface; construct/select the concrete implementation in one place.
- Screens, routing, and stores never learn which implementation is active.

---

## 10. Action orchestration hook

**When:** a user action needs pending/error state and coordinates a service call with a
store write.

**Canonical:** [`use-sign-in.ts`](../../src/features/sign-in/model/use-sign-in.ts).

```ts
export function useDoAction() {
  const commit = useWriteToStore();
  const [pending, setPending] = useState<Key | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: Key): Promise<void> {
    if (pending) return;                 // guard re-entry
    setPending(key);
    setError(null);                      // reset on new attempt
    try {
      const result = await service.run(key);
      commit(result);                    // write to store; do NOT navigate here
    } catch (cause) {
      if (!(cause instanceof CancelledError)) setError(ACTION_ERROR_MESSAGE); // silent on cancel
    } finally {
      setPending(null);                  // always clear
    }
  }

  return { run, pending, error };
}
```

**Rules**
- Own `pending`/`error`; guard re-entry; reset error on a new attempt; clear pending in
  `finally`.
- Run the service, then write to the owning store. **Do not navigate** — navigation is
  declarative via the route guard reacting to state.
- Distinguish user-cancellation (silent) from real failure (surface a message).
  User-facing copy is Korean and lives in the feature, not in shared.

---

## 11. Local async resource hook

**When:** loading and mutating a device-local resource (files, media) with reload and
optimistic list updates.

**Canonical:** [`use-local-recordings.ts`](../../src/features/manage-recordings/model/use-local-recordings.ts).

```ts
export function useLocalX() {
  const isMounted = useRef(true);
  const [items, setItems] = useState<X[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    isMounted.current = true;
    void listX()
      .then((next) => { if (isMounted.current) setItems(next); })
      .catch(() => { if (isMounted.current) setErrorMessage('불러오지 못했어요.'); })
      .finally(() => { if (isMounted.current) setIsLoading(false); });
    return () => { isMounted.current = false; };
  }, []);

  const removeX = async (item: X) => {
    try {
      await deleteX(item.uri);
      if (isMounted.current) setItems((cur) => cur.filter((i) => i.id !== item.id)); // optimistic
    } catch {
      if (isMounted.current) setErrorMessage('삭제하지 못했어요.');
    }
  };

  return { items, isLoading, errorMessage, clearError: () => setErrorMessage(undefined), removeX };
}
```

**Rules**
- Guard every post-await `setState` with an `isMounted` ref.
- Expose `isLoading`, per-item progress state where relevant, an `errorMessage` string,
  `clearError`, and the mutating actions.
- Update the list optimistically on success; set a Korean `errorMessage` on failure.
  Keep the file-system/native calls in a shared adapter (§12), not in the hook.

---

## 12. Shared adapter vs. feature product-flow split

**When:** using a native/device capability (Location, Notifications, Camera, files).

**Canonical:** raw native in [`shared/lib/location`](../../src/shared/lib/location) vs.
product flow in [`geofence-monitor.ts`](../../src/features/geofence-monitor/model/geofence-monitor.ts);
same split for [`recording-files`](../../src/shared/lib/recording-files) and
[`notifications`](../../src/shared/lib/notifications).

```ts
// shared/lib/location — narrow native primitive, no product rules, no copy
export function requestBackgroundLocationPermission(): Promise<PermissionResult> { /* native call */ }

// features/geofence-monitor/model — product flow: ordering, Korean copy, replace-logic
export async function ensureGeofencePermissions(): Promise<LocationPermissionResult> {
  const foreground = await requestForegroundLocationPermission();
  if (!foreground.granted) return { granted: false, reason: 'foreground-denied', /* Korean message */ };
  const background = await requestBackgroundLocationPermission();
  if (!background.granted) return { granted: false, reason: 'background-denied', /* Korean message */ };
  return { granted: true };
}
```

**Rules**
- `shared/lib/*` owns narrow native calls and permission primitives only — no product
  rules, no user-facing copy.
- The feature owns the product flow: permission *ordering* (foreground → background),
  Korean copy, "replace existing monitoring" logic, cooldowns.
- See [state and data](../frameworks/state-and-data.md#securestore-and-device-apis).

---

## 13. Platform variants with an identical export contract

**When:** a module needs a different implementation on web (or iOS/Android).

**Canonical:** `messaging.ts` / `messaging.web.ts`, `local.ts` / `local.web.ts` in
[`shared/lib/notifications`](../../src/shared/lib/notifications); also `recording-files`,
`secure-storage`, and `animated-splash-overlay.tsx` / `.web.tsx`.

```text
shared/lib/notifications/
├── messaging.ts        # native implementation
├── messaging.web.ts    # web implementation — SAME exported names/signatures
├── local.ts
├── local.web.ts
└── index.ts            # re-exports; consumers import only this
```

**Rules**
- Every platform file exports the **same contract**; consumers import the module's
  Public API and let Metro pick `.ios` / `.android` / `.native` / `.web`.
- Never import a platform file directly by extension.

### 13a. Global-scope background task definition

**When:** an OS-driven background task (geofencing, background fetch).

**Canonical:** [`geofence-task.ts`](../../src/features/geofence-monitor/model/geofence-task.ts).

```ts
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

export const GEOFENCE_TASK_NAME = 'snaply-geofence-monitor'; // shared with startGeofencing

// Module scope (not a component/effect) so the OS can run it on background relaunch.
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
    if (error) { if (__DEV__) console.warn('[geofence] task error:', error.message); return; }
    if (data) await handleGeofenceEvent(data as GeofenceTaskData);
  });
}
```

**Rules**
- Call `TaskManager.defineTask` at **module scope**, guarded by `Platform.OS !== 'web'`.
- Share one stable task-name constant between the definition and `startGeofencing`.
- Client-side cooldowns are in-memory best-effort; treat the backend as authoritative.

---

## 14. Consuming the design system

**When:** any `pages/*/ui` or component that renders.

**Canonical:** [`home-page.tsx`](../../src/pages/home/ui/home-page.tsx); tokens/hooks in
[`shared/ui/theme`](../../src/shared/ui/theme); text via
[`ThemedText`](../../src/shared/ui/themed-text);
[`SnaplyButton`](../../src/shared/ui/snaply-button).

```tsx
import { Radius, Spacing, useTabBarHeight, useTheme, useTopContentInset } from '@/shared/ui/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export function XPage() {
  const theme = useTheme();
  const topInset = useTopContentInset();
  const tabBarHeight = useTabBarHeight();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: Spacing.six + topInset, paddingBottom: tabBarHeight, gap: Spacing.six }}
    >
      <ThemedText type="title">제목</ThemedText>
      <View style={{ borderRadius: Radius.large, backgroundColor: theme.backgroundElement }} />
    </ScrollView>
  );
}
```

**Rules**
- Read colors from `useTheme()`; use `Spacing`, `Radius`, `MaxContentWidth` tokens
  instead of magic numbers.
- Render text with `ThemedText` (`type` + `themeColor`) rather than raw `Text`.
- Respect insets with `useTopContentInset()` / `useTabBarHeight()`.

---

## 15. Testing patterns

**When:** any function, component, hook, or store. See
[writing unit tests](../workflows/writing-unit-tests.md) for full guidance; this is the
boundary-mocking pattern to imitate.

**Canonical:** [`use-sign-in.test.ts`](../../src/features/sign-in/model/use-sign-in.test.ts).

```ts
import { act, renderHook } from '@testing-library/react-native';

const mockCommit = jest.fn();
jest.mock('@/entities/session', () => ({ useSetSession: () => mockCommit })); // mock at the Public API

describe('useDoAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('commits on success', async () => {
    const { result } = await renderHook(() => useDoAction());
    await act(async () => { await result.current.run('key'); });
    expect(mockCommit).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('stays silent on cancel', async () => { /* reject with CancelledError → no commit, no error */ });
  it('surfaces an error on failure', async () => { /* reject with Error → error set */ });
});
```

**Rules**
- Mock a dependency at its **slice Public API** (`jest.mock('@/entities/session')`), not
  at deep internal paths.
- Test the observable contract across branches — for an action hook: success, cancel
  (silent), failure (error surfaced).
- Co-locate the test next to the unit (`*.test.ts` / `*.test.tsx`).

---

## Cross-cutting principles these patterns share

1. **One reason to change per file** — transport ≠ mapping ≠ query key ≠ product flow.
2. **Cross boundaries only through Public APIs** — named exports in `index.ts`, no
   `export *`, no deep imports.
3. **Every stopgap documents its replacement** — mock routing, local persistence, and
   in-memory cooldowns all comment how the real backend supersedes them.
4. **User-facing copy (Korean) lives in features/pages; raw native lives in shared.**

## Sources

- [Feature-Sliced Design](../architecture/feature-sliced-design.md)
- [Module boundaries](./module-boundaries.md)
- [State and data placement](../frameworks/state-and-data.md)
- [SOLID for React Native](./solid-react-native.md)
- [Feature development workflow](../workflows/feature-development.md)
