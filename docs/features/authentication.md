# Authentication

## User goal

Users sign in to Snaply with a social account (Google or Apple) before reaching the app. A signed-in session gates the main experience and persists across restarts, and users can sign out from Settings.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| See the sign-in screen when signed out | `Functional` | The root route guard shows `/sign-in` whenever no session exists, including on cold start and deep links into protected routes. |
| Choose a social provider | `Functional` | Google and Apple buttons run the real Supabase Auth PKCE OAuth flow: an in-app browser handles provider consent and the returned authorization code is exchanged for a Supabase session. Requires a development build and configured Supabase credentials (see below). |
| Development sign-in without a backend | `Functional` | In development builds (`__DEV__`) where Supabase credentials are absent (`isSupabaseConfigured` is false), the sign-in action automatically uses the offline mock provider instead of dead-ending on the placeholder host. Any production build always uses Supabase regardless of configuration. |
| Pending and error feedback | `Functional` | The pressed provider shows a spinner and the others disable while it resolves. A failure surfaces an inline alert message; a user-cancelled browser dismissal is silent (no error). |
| Stay signed in across restarts | `Functional` | Supabase persists its session through the chunked SecureStore adapter and restores it on launch; the splash overlay stays up until the initial session is read back. Tokens refresh automatically while the app is foregrounded. |
| Reach the app after signing in | `Functional` | Once a session exists the guard reveals the tabs and capture stack; no manual navigation is performed. |
| Sign out | `Functional` | The Settings account control calls `supabase.auth.signOut()`; the auth listener clears the mirrored session, returning the user to `/sign-in`. |

## Route flow

```text
Cold start
  → splash overlay held until Supabase's initial session is read back
  → no session  → /sign-in (guarded)
  → session     → (tabs) and /capture/* (guarded)

/sign-in → press Google/Apple → in-app browser consent → code exchanged for a
           Supabase session → auth listener mirrors the user → guard reveals (tabs)
Settings → 로그아웃 → supabase.auth.signOut() → guard returns to /sign-in
```

## Ownership and state

| Concern | Owner |
| --- | --- |
| Session meaning, current user, hydration, sign-out | `src/entities/session` (`model/session-store.ts`, `model/user.ts`, `model/map-user.ts`) |
| Supabase client, session persistence, token auto-refresh | `src/shared/lib/supabase` (`supabase-client.ts`) |
| Large-value token storage | `src/shared/lib/secure-storage` (`chunked-secure-storage.ts`, `.web.ts`) |
| Sign-in action, provider abstraction, Supabase/mock providers, provider button UI | `src/features/sign-in` |
| Sign-in screen composition | `src/pages/sign-in` |
| Route file | `src/app/sign-in.tsx` (thin adapter) |
| Access-control composition (route guard) and session bootstrap | `src/_app/routes/root-layout.tsx` (`Stack.Protected` + `initSession`) |
| Sign-out control | `src/pages/settings` (calls the session entity's `useClearSession`) |

**Supabase owns the session.** The `supabase` client persists the session (access token, refresh token, user) via the chunked SecureStore adapter and refreshes tokens automatically while the app is active. The zustand session store no longer persists its own copy; instead `initSession` (run once from the root layout) subscribes to `supabase.auth.onAuthStateChange`, mirrors the derived `User` into the store, and flips `hasHydrated` on the first event. `initSession` is the single writer for Supabase-driven changes (restore on launch, refresh, sign-out); the sign-in action additionally writes the user directly for immediate feedback (and to support the offline mock provider). The store still exposes the same focused selector hooks (`useCurrentUser`, `useIsAuthenticated`, `useSessionHydrated`, `useSetSession`, `useClearSession`) through the slice Public API.

The sign-in action is isolated behind the `AuthProvider` interface in `features/sign-in/model/auth-provider.ts`. `use-sign-in.ts` binds `supabaseAuthProvider` by default and automatically falls back to `mockAuthProvider` in development builds when Supabase is unconfigured (`__DEV__ && !isSupabaseConfigured`), so offline development works without editing code; production always binds Supabase. Screens, routing, and the store are unaffected by which provider is bound. The derived `User` (`entities/session/model/map-user.ts`) carries only identity fields (`id`, `provider`, `displayName`, `avatarUrl`); no tokens are copied out of the Supabase session.

## Backend contract

The backend does not perform login. The app authenticates against Supabase directly; the resulting JWT is sent as `Authorization: Bearer <access_token>` to the backend API, which verifies it and upserts the app user on first call (`GET /auth/me`). Wiring the authenticated API client is out of scope for this feature.

## Platform support

- **A development build is required** — real OAuth uses the app's custom `snaplyapp` scheme for the redirect and the `expo-web-browser`/`expo-auth-session` native modules; it does not work in the standard Expo Go client. Android runs via a local development build; iOS runs via EAS Build.
- Google and Apple buttons render on every platform. On web, persistence uses localStorage (per the chunked adapter's `.web` variant); native uses SecureStore.
- Offering social login on iOS requires **Apple sign-in** for App Store review — it is included.

## Configuration

Environment (`.env`, see `.env.example`):

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — client-safe values from the Supabase project (anon key is public, gated by Row Level Security). Without them the app still boots for mock/offline development but real sign-in cannot complete.

Supabase dashboard and provider consoles (one-time setup):

- Auth → Providers: enable **Google** (OAuth client id/secret from Google Cloud Console) and **Apple** (Service ID, Team ID, Key ID, private key from Apple Developer).
- Auth → URL Configuration → Redirect URLs: allow `snaplyapp://auth/callback`.
- Google/Apple consoles: register the Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback`.

## Token storage

Supabase's session is stored under its own key (`sb-<project-ref>-auth-token`) through `chunkedSecureStorage`. Because a session JSON commonly exceeds SecureStore's ~2048-byte single-value limit, the adapter splits it across numbered keys (`<key>.0`, `<key>.1`, …) with a `<key>.chunks` count, staying encrypted at rest in the OS keychain/keystore. Splitting is UTF-8-byte-aware and never divides a surrogate pair.

## Known limitations and implementation requirements

- Real authentication requires the configuration above plus a development build; it cannot be exercised in Expo Go or in JavaScript unit tests (which mock the Supabase client, `expo-web-browser`, and `expo-auth-session`).
- Only Google and Apple are configured. Kakao/Naver are not offered — Supabase Auth does not support them without custom OIDC setup.
- The authenticated backend API client (`Authorization: Bearer` injection over TanStack Query) is not wired yet; it is separate from sign-in.
- Provider buttons render each provider's official brand mark (bundled SVG assets under `features/sign-in/ui/provider-icons`, drawn with `expo-image`).
- Account deletion in Settings remains a no-op prototype and is unrelated to this flow.
