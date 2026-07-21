# Authentication

## User goal

Users sign in to Snaply with a social account (Kakao, Naver, Google, or Apple) before reaching the app. A signed-in session gates the main experience and persists across restarts, and users can sign out from Settings.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| See the sign-in screen when signed out | `Functional` | The root route guard shows `/sign-in` whenever no session exists, including on cold start and deep links into protected routes. |
| Choose a social provider | `Partial` | Kakao, Naver, Google, and Apple buttons run a **simulated** provider that returns a local user after a short delay. No real OAuth, token exchange, or backend call happens yet. |
| Pending and error feedback | `Functional` | The pressed provider shows a spinner and the others disable while it resolves; a failure surfaces an inline alert message. |
| Stay signed in across restarts | `Functional` | The session is persisted through the SecureStore adapter and restored on launch; the splash overlay stays up until restoration finishes. |
| Reach the app after signing in | `Functional` | Once a session exists the guard reveals the tabs and capture stack; no manual navigation is performed. |
| Sign out | `Functional` | The Settings account control clears the session, which returns the user to `/sign-in`. |

## Route flow

```text
Cold start
  → splash overlay held until the session store hydrates
  → no session  → /sign-in (guarded)
  → session     → (tabs) and /capture/* (guarded)

/sign-in → press a provider → simulated sign-in → session created → guard reveals (tabs)
Settings → 로그아웃 → session cleared → guard returns to /sign-in
```

## Ownership and state

| Concern | Owner |
| --- | --- |
| Session meaning, current user, persistence and clearing | `src/entities/session` (`model/session-store.ts`, `model/user.ts`) |
| Sign-in action, provider abstraction, mock provider, provider button UI | `src/features/sign-in` |
| Sign-in screen composition | `src/pages/sign-in` |
| Route file | `src/app/sign-in.tsx` (thin adapter) |
| Access-control composition (route guard) | `src/_app/routes/root-layout.tsx` via `Stack.Protected` |
| Sign-out control | `src/pages/settings` (calls the session entity's `clearSession`) |

The session store follows the same zustand + `persist` + SecureStore pattern as the theme-mode store. It exposes focused selector hooks (`useCurrentUser`, `useIsAuthenticated`, `useSessionHydrated`, `useSetSession`, `useClearSession`) through the slice Public API; the raw store is exported only for co-located tests. The feature depends on the entity's `User`/`SocialProvider` types and its `useSetSession` action; screens never touch the store directly.

The sign-in action is isolated behind the `AuthProvider` interface in `features/sign-in/model/auth-provider.ts`. Swapping the single `authProvider` binding in `use-sign-in.ts` from `mockAuthProvider` to a real implementation is the only change needed to make sign-in functional; screens, routing, persistence, and the session store are unaffected.

## Platform support

- iOS, Android, and web share the same mock flow. Persistence uses SecureStore on native and localStorage on web (per the shared secure-storage adapter).
- All four provider buttons render on every platform in this phase. When real providers are wired, Apple sign-in visibility and the Kakao/Naver web-vs-native flows must be revisited (see below).

## Known limitations and implementation requirements

- **No real authentication.** `mockAuthProvider` returns a deterministic local user; it does not contact Kakao, Naver, Google, Apple, or any backend, and issues no real token.
- **No backend or BaaS yet.** The real implementation will exchange the provider authorization code for a session on a server or managed auth service. Until then there is no identity verification.
- When real auth lands, document per provider: the OAuth/redirect configuration, whether a development build (config plugin) is required, token storage keys and refresh behavior, error and cancellation states, and platform gating. Offering any social login on iOS requires **Apple sign-in** for App Store review.
- Provider buttons render each provider's official brand mark (bundled SVG assets under `features/sign-in/ui/provider-icons`, drawn with `expo-image`).
- Account deletion in Settings remains a no-op prototype and is unrelated to this flow.
