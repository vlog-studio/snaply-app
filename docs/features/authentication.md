# Authentication

## User goal

Users sign in to Snaply with an email and password before reaching the app: they can create an account (confirmed via an emailed link that deep-links back into the app), sign in, and reset a forgotten password (also via an emailed link). A signed-in session gates the main experience and persists across restarts, and users can sign out from Settings. Social sign-in (Google/Apple) is deferred — its code is retained but not shown on the sign-in screen.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| See the sign-in screen when signed out | `Functional` | The root route guard shows `/sign-in` whenever no session exists, including on cold start and deep links into protected routes. |
| Sign in with email and password | `Functional` | The email form validates the address format and presence, then runs `supabase.auth.signInWithPassword`. A not-yet-confirmed account surfaces a distinct message pointing the user to confirm their email. Requires configured Supabase credentials (see below). |
| Create an account | `Functional` | `/sign-up` collects email + password (with confirmation), calls `supabase.auth.signUp` with `emailRedirectTo` set to the app deep link, and — because email confirmation is enabled — shows a check-your-email notice. Tapping the link in the email opens the app (`snaplyapp://auth/callback?code=…`); the global deep-link handler runs `exchangeCodeForSession`, which signs the user in. The confirmation email can be re-sent. |
| Reset a forgotten password | `Functional` | `/reset-password` sends a recovery link via `resetPasswordForEmail` (`redirectTo` = `snaplyapp://auth/reset`) and shows a check-your-email notice. Tapping the link opens the app; the handler exchanges the code for a recovery session and sets `isRecovering`, which the guard uses to force the `/update-password` screen where `updateUser` saves the new password. |
| Social sign-in (Google/Apple) | `Deferred` | The PKCE OAuth providers, buttons, and icons remain in `features/sign-in` but are not rendered on the sign-in screen. Re-enable by rendering `SocialLoginList` again and completing provider setup below. |
| Development sign-in without a backend | `Functional` | In development builds (`__DEV__`) where Supabase credentials are absent (`isSupabaseConfigured` is false), email sign-in uses an offline mock instead of dead-ending on the placeholder host. Sign-up/reset mocks create no session (they cannot simulate an email deep link), so those flows only complete against a real Supabase project. Any production build always uses Supabase. |
| Pending and error feedback | `Functional` | The submit button shows a pending label and inputs disable while a request resolves. Field-level validation errors render under each input; server failures render a Korean message near the button. |
| Stay signed in across restarts | `Functional` | Supabase persists its session through the chunked SecureStore adapter and restores it on launch; the splash overlay stays up until the initial session is read back. Tokens refresh automatically while the app is foregrounded. |
| Reach the app after signing in | `Functional` | Once a session exists the guard reveals the tabs and capture stack; no manual navigation is performed. |
| Sign out | `Functional` | The Settings account control calls `supabase.auth.signOut()`; the auth listener clears the mirrored session, returning the user to `/sign-in`. |

## Route flow

```text
Cold start
  → splash overlay held until Supabase's initial session is read back
  → no session  → /sign-in (guarded)
  → session     → (tabs) and /capture/* (guarded)

/sign-in → enter email + password → signInWithPassword → session → guard reveals (tabs)
/sign-in → "가입하기" → /sign-up → signUp(emailRedirectTo) → "메일 확인" notice
           → tap email link → snaplyapp://auth/callback?code → exchangeCodeForSession → (tabs)
/sign-in → "비밀번호를 잊으셨나요?" → /reset-password → resetPasswordForEmail(redirectTo) → "메일 확인" notice
           → tap email link → snaplyapp://auth/reset?code → exchangeCodeForSession + isRecovering=true
           → guard forces /update-password → updateUser → finishPasswordRecovery → (tabs)
Settings → 로그아웃 → supabase.auth.signOut() → guard returns to /sign-in
```

Email links are handled by real Expo Router routes — `/auth/callback` (sign-up
confirmation, and OAuth) and `/auth/reset` (recovery) — declared outside every
guard group so the deep link always resolves. Each screen exchanges the PKCE
`code` for a session and redirects. Using separate route paths (rather than one
global `Linking` listener) is required: Expo Router owns deep-link routing, so an
unrouted `snaplyapp://auth/...` link renders "Unmatched Route". The two paths also
let the handler tell confirmation from recovery without relying on the auth event.

`/sign-in`, `/sign-up`, and `/reset-password` live in the signed-out guard group.
`/update-password` lives in a recovery guard group (`isRecovering`) that takes
precedence over the authenticated group, so a recovery deep link — which signs
the user in — cannot reach the app until the new password is set.

## Ownership and state

| Concern | Owner |
| --- | --- |
| Session meaning, current user (incl. `AuthMethod` = social + `'email'`), hydration, recovery state, sign-out | `src/entities/session` (`model/session-store.ts`, `model/user.ts`, `model/map-user.ts`) |
| Auth email deep-link code exchange (`exchangeAuthCode` → `exchangeCodeForSession`) | `src/entities/session` (`model/session-store.ts`), invoked by the `auth/callback` + `auth/reset` route screens (`src/pages/auth-callback`) |
| Supabase client, session persistence, token auto-refresh; shared auth redirect URLs | `src/shared/lib/supabase` (`supabase-client.ts`, `auth-redirect.ts`) |
| Large-value token storage | `src/shared/lib/secure-storage` (`chunked-secure-storage.ts`, `.web.ts`) |
| Email/format/password validation primitives | `src/shared/lib/validation` (`is-valid-email.ts`, `is-valid-password.ts`) |
| Themed text input primitive used by every auth form | `src/shared/ui/text-field` |
| Email sign-in action + provider abstraction; deferred social action, providers, and button UI | `src/features/sign-in` |
| Sign-up flow — create account + resend (provider, `use-sign-up-flow`, form + email-sent notice) | `src/features/sign-up` |
| Password reset — request link (`use-request-reset`) and set new password (`use-update-password`, provider, forms) | `src/features/reset-password` |
| Sign-in / sign-up / reset / update-password / auth-callback screen composition | `src/pages/sign-in`, `src/pages/sign-up`, `src/pages/reset-password`, `src/pages/update-password`, `src/pages/auth-callback` |
| Route files | `src/app/sign-in.tsx`, `src/app/sign-up.tsx`, `src/app/reset-password.tsx`, `src/app/update-password.tsx`, `src/app/auth/callback.tsx`, `src/app/auth/reset.tsx` (thin adapters) |
| Access-control composition (route guard) and session bootstrap | `src/_app/routes/root-layout.tsx` (`Stack.Protected` + `initSession`) |
| Sign-out control | `src/pages/settings` (calls the session entity's `useClearSession`) |

**Supabase owns the session.** The `supabase` client persists the session (access token, refresh token, user) via the chunked SecureStore adapter and refreshes tokens automatically while the app is active. The zustand session store no longer persists its own copy; instead `initSession` (run once from the root layout) subscribes to `supabase.auth.onAuthStateChange`, mirrors the derived `User` into the store, and flips `hasHydrated` on the first event. `initSession` is the single writer for Supabase-driven changes (restore on launch, refresh, sign-out); the sign-in action additionally writes the user directly for immediate feedback (and to support the offline mock provider). The store still exposes the same focused selector hooks (`useCurrentUser`, `useIsAuthenticated`, `useSessionHydrated`, `useSetSession`, `useClearSession`) through the slice Public API.

Every auth action is isolated behind a provider interface, selected once per hook behind `__DEV__ && !isSupabaseConfigured` (Supabase in production, offline mock in unconfigured dev builds): social sign-in (`AuthProvider`, `use-sign-in.ts`), email sign-in (`EmailAuthProvider`, `use-email-sign-in.ts`), sign-up (`SignUpProvider`, `use-sign-up-flow.ts`), and password reset (`ResetPasswordProvider`, `use-request-reset.ts` + `use-update-password.ts`). Screens, routing, and the store are unaffected by which implementation is bound. **Email confirmation and password recovery complete out of band**: the emailed link deep-links into the app, Expo Router routes it to the `/auth/callback` or `/auth/reset` screen, and that screen calls `exchangeAuthCode` (`exchangeCodeForSession`); the `onAuthStateChange` listener then mirrors the user, so no feature hook verifies a token. Navigation stays fully declarative via the route guard reacting to `isAuthenticated` / `isRecovering` — no auth hook navigates. The derived `User` (`entities/session/model/map-user.ts`) carries only identity fields (`id`, `provider` as `AuthMethod`, `displayName`, `avatarUrl`); no tokens are copied out of the Supabase session.

## Backend contract

The backend does not perform login. The app authenticates against Supabase directly; the resulting JWT is sent as `Authorization: Bearer <access_token>` to the backend API, which verifies it and upserts the app user on first call (`GET /auth/me`). Wiring the authenticated API client is out of scope for this feature.

## Platform support

- **Email/password sign-in** uses only the Supabase client over HTTP, so it works anywhere once Supabase credentials are set.
- **Sign-up confirmation and password reset rely on email deep links** back to the `snaplyapp://` scheme, so they need a build that registers the custom scheme (development build or standalone) — the custom-scheme round-trip is unreliable in the standard Expo Go client. The confirmation/recovery link must be opened **on the same device running the app** for the automatic sign-in to complete (PKCE stores the code verifier on the initiating device). Opening it elsewhere still confirms the email server-side; the user then signs in with their password.
- The **iOS Simulator has no Mail app**, so a confirmation email cannot be opened inside it directly. To test, feed the link into the simulator, e.g. `xcrun simctl openurl booted "snaplyapp://auth/callback?code=…"`, or paste the confirmation URL into Simulator Safari.
- On web, session persistence uses localStorage (per the chunked adapter's `.web` variant); native uses SecureStore.
- Deferred social sign-in additionally uses the `expo-web-browser`/`expo-auth-session` native modules; offering social login on iOS also requires **Apple sign-in** for App Store review.

## Configuration

Environment (`.env`, see `.env.example`):

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — client-safe values from the Supabase project (anon key is public, gated by Row Level Security). Without them the app still boots for mock/offline development but real sign-in cannot complete.

Supabase dashboard (one-time setup for email/password):

- Auth → Sign In / Providers → Email: keep **Email** enabled, **Confirm email** on, and user sign-up allowed.
- Auth → URL Configuration → Redirect URLs: allow **both** `snaplyapp://auth/callback` (sign-up confirmation) and `snaplyapp://auth/reset` (password recovery). These are the `emailRedirectTo` / `redirectTo` targets the app passes.
- The default **Confirm signup** and **Reset password** email templates (which use `{{ .ConfirmationURL }}`) work as-is — **no template editing required**. This is the reason for the deep-link approach: editing default-sender templates is restricted on new free-tier projects, whereas Redirect URL configuration is not.

Deferred — social provider setup (only needed when re-enabling Google/Apple):

- Auth → Providers: enable **Google** (OAuth client id/secret from Google Cloud Console) and **Apple** (Service ID, Team ID, Key ID, private key from Apple Developer).
- The `snaplyapp://auth/callback` redirect above is reused by the OAuth flow.
- Google/Apple consoles: register the Supabase callback `https://<project-ref>.supabase.co/auth/v1/callback`.

## Token storage

Supabase's session is stored under its own key (`sb-<project-ref>-auth-token`) through `chunkedSecureStorage`. Because a session JSON commonly exceeds SecureStore's ~2048-byte single-value limit, the adapter splits it across numbered keys (`<key>.0`, `<key>.1`, …) with a `<key>.chunks` count, staying encrypted at rest in the OS keychain/keystore. Splitting is UTF-8-byte-aware and never divides a surrogate pair.

## Known limitations and implementation requirements

- Real authentication requires the Supabase configuration above (URL + anon key, and the two Redirect URLs). Unit tests mock the Supabase client at the slice Public API and never hit the network.
- Email confirmation and password reset use **deep links**, not OTP codes. Both callback URLs (`snaplyapp://auth/callback`, `snaplyapp://auth/reset`) must be in the Redirect allowlist, and the link must be opened on the app's device for automatic sign-in (see Platform support).
- The offline dev mocks cannot simulate an email deep link, so **sign-up and password reset only complete against a real Supabase project**; email sign-in still works via the mock offline.
- Social sign-in is deferred (code retained, not rendered). Kakao/Naver are still not offered — Supabase Auth does not support them without custom OIDC setup.
- The authenticated backend API client (`Authorization: Bearer` injection over TanStack Query) is not wired yet; it is separate from sign-in.
- Account deletion in Settings remains a no-op prototype and is unrelated to this flow.
