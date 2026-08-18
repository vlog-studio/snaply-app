# Credits and rewarded ads

## User goal

Movie generation costs credits (one export = 100). The 크레딧 screen (`/settings/credits`) shows the balance, the recent ledger, and one row that turns a rewarded ad into credits. The movie screen is where credits are *spent*; this screen is where they are seen and earned.

## Where the truth lives

The balance's only source is the backend (`GET /billing/credits`). Grants land server-side — a store purchase through its webhook, an ad view through the ad network's server-side verification (SSV) callback — so the app **never** computes, adjusts, or reports a balance change. It reads, and after anything that should have changed the balance it invalidates and reads again.

The same holds for the rewarded-ad policy: the reward amount, the daily limit, the cooldown, and whether the feature exists at all are the server's answers (`GET /billing/ad-rewards`). The app hardcodes none of them, so a policy change (or the kill switch) lands without a release.

## Current behavior

| Capability | Status | Actual behavior |
| --- | --- | --- |
| Balance read-out | `Functional` | Verified on device against the real backend (2026-08-14). The 나 tab's 크레딧 row reads the current balance as its one-line summary; `/settings/credits` shows it as the hero with "보유 크레딧 · 무비 1편 = 100" under it. While loading or on error the row shows no number rather than a stale one; the screen offers 다시 불러오기 on error. |
| Ledger (내역) | `Functional` (not yet seen with data) | The verification account has no ledger rows, so the list has only ever rendered empty on a device. The newest 50 rows (the server's window — not the full history, no pagination), each as reason + timestamp + signed delta. Known reasons map to Korean labels (`purchase` 크레딧 구매, `signup_bonus` 가입 보너스, `export_reserve` 무비 만들기, `export_refund` 만들기 취소 환급, `store_refund_revoke` 구매 환불 회수, `promo` 프로모션, `ad_reward` 광고 보상); an unknown reason falls back to 기타 instead of failing the response — the DTO deliberately widens the spec's enum to `string`. |
| Watch a rewarded ad | `Partial` | One row: "광고 보고 +N" with the day's remaining count as its read-out, shown only while the server's `enabled` is true. Pressing it issues a reward session (`POST /billing/ad-rewards`), shows the ad with the session's `nonce`/`ssvUserId` aboard, then polls `GET /billing/ad-rewards/{rewardId}` (7 attempts, 1.5 s apart) until the server confirms the grant. On `granted` both the credit and availability queries are invalidated and the row answers "+N 지급됐어요." **`Partial` because the ad is a mock**: no ad SDK is installed, so no ad is ever shown and no credit is ever granted — see [Required to finish](#required-to-finish-admob-integration). |
| Insufficient balance on generate | `Functional` | Verified on device against the real backend (2026-08-14): a 0-credit account pressing 이 구성으로 다시 만들기 got "크레딧이 부족해요 · 0/100…" and the movie was left untouched. `POST /edit-jobs` answering `402 INSUFFICIENT_CREDITS` becomes the movie footer's own refusal (`no-credit`): "크레딧이 부족해요 · {balance}/{required}. 나 탭의 크레딧에서 채울 수 있어요." — the numbers come from the 402's `error.required`/`error.balance` and are omitted when absent. Reserved credits are refunded server-side when a run fails or is cancelled; the app just refetches. |
| Buy credits | `Not implemented` | The backend sells consumable credit packs through store IAP (RevenueCat; `GET /billing/products`, `POST /billing/sync`), but no purchase UI or store SDK exists in the app. The 크레딧 screen shows no purchase entry rather than a dead one. |

## The rewarded-ad flow, and why it is shaped this way

The app never tells the server "the ad was watched" — no such request exists, by design: a client-callable grant endpoint would be an attack surface (replay, rooted devices). The grant is written when the ad network's SSV callback reaches the backend. Hence:

- The SDK's reward event is treated as a *hint to start polling*, never as proof of a grant.
- `pending` (the ad completed but the grant had not landed within the poll window) is a **normal outcome, not a failure** — worded "지급 확인 중이에요. 잔액에 곧 반영돼요." The queries are invalidated even then, so a late grant appears on the next refetch.
- A `409 AD_REWARD_SESSION_ACTIVE` on session issue means the previous ad's grant is still in flight; the hook resumes polling that session (`error.rewardId`) instead of refusing.
- **An ad that never reached its reward point hands the slot back** (`DELETE /billing/ad-rewards/{rewardId}`, added 2026-08-14). Only one session may be pending at a time, so without this a dismissed ad would lock the next one out until the session expired. The direction is safe — the app can only ever give a reward up, never create one — and it is not a forfeit: the session keeps its grant eligibility, so a callback already in flight still pays (`abandoned` → `granted`). A failed release is not surfaced: the session times out on its own, which is the behavior this call exists to shorten. The app does **not** release after a `pending` settle — an ad that did reach its reward point may still be paid, and the wait is the same either way now that the session TTL matches the cooldown.
- Session refusals map to their own read-outs: `AD_REWARD_COOLDOWN` 잠시 뒤에, `AD_REWARD_LIMIT_REACHED` 오늘은 다 봤어요, `AD_REWARDS_DISABLED` hides the entry point entirely (`enabled: false` is the server's kill switch).
- A dismissed ad (closed before the reward point) gets no reproach line — the user's own call; the row's unchanged state is the answer.

## Required to finish: AdMob integration

**No ad SDK is installed.** `mockRewardAdProvider` stands in for it — it resolves `earned` after 1.2 s without showing anything — so the flow above runs end to end while never displaying an ad and never earning a credit. Until AdMob is wired, this feature cannot pay a single credit in production, and every reward session ends in `pending`: nothing calls the backend's SSV endpoint, because nothing played an ad.

Verified on device (2026-08-14, SM-S908N, against the real backend with `AD_REWARD_ENABLED=true`): session issue, the `showing` → `settling` phases, the `pending` outcome, and the `409 AD_REWARD_SESSION_ACTIVE` resume branch all work. Everything *after* a grant — the `granted` outcome, the ledger row, the daily-limit countdown — is covered only by unit tests, because a grant requires a signed SSV callback that no part of this setup can produce.

What the integration needs, in the order it blocks on:

1. **AdMob console (external, blocks everything below)** — an AdMob app per platform (its App ID), a rewarded ad unit per platform (its ad unit ID), and **server-side verification enabled on each ad unit with the backend's callback URL** (`GET /billing/webhook/admob`). The backend also needs `ADMOB_SSV_ALLOWED_AD_UNITS` set to those ad unit IDs — it rejects every callback while that is empty.
2. **SDK and native config** — `react-native-google-mobile-ads` plus its config plugin in `app.json` (the two App IDs, iOS `SKAdNetworkItems`). Ad unit IDs belong in env, read through a `shared/config` module; development builds must use Google's test unit IDs. This is a native change: prebuild and a new dev-client build, and Expo Go can never show an ad.
3. **Consent, before the SDK initializes** — Google UMP for GDPR and, on iOS, ATT (`expo-tracking-transparency`). Both are app-start concerns, so they belong in an `_app` provider gate alongside `PushTokenGate`, not inside this feature.
4. **The provider implementation** — an `admobRewardAdProvider` implementing `RewardAdProvider`: load a rewarded ad, pass the session's `nonce` as the SDK's `customData` and `ssvUserId` as its `userId`, show it, and map the SDK's events onto `earned` / `dismissed` / `unavailable`. It replaces `mockRewardAdProvider` at the single selection point in `use-watch-reward-ad.ts`; nothing else in the feature or the screens changes. A `.web.ts` variant answers `unavailable`.
5. **Store declarations** — App Store Connect privacy (device ID collected for tracking, the IDFA question) and Play Console (contains ads, data safety for the advertising ID, content rating). The SDK adds the `AD_ID` permission on Android, and shipping without declaring it is a review rejection.

Until step 1 is done, none of the rest can be verified, so the mock provider stays and this document keeps saying so.

## Ownership

- `src/entities/credit` — the balance domain model, `GET /billing/credits` (DTO → domain), `creditQueries`. The mock ledger (`api/mock-credits.ts`) is mutable so mock-mode grants move the balance; `grantMockCredits`/`readMockCreditBalance` are exported as a documented mock-only seam.
- `src/features/watch-reward-ad` — the four `/billing/ad-rewards` calls (availability, issue, poll, release), `adRewardQueries.availability()`, the `RewardAdProvider` seam (the AdMob implementation will replace `mockRewardAdProvider` in one place, `use-watch-reward-ad.ts`), and the `useWatchRewardAd` state machine (`idle → preparing → showing → settling`).
- `src/features/compose-movie` — the `no-credit` generation refusal and `readCreditShortfall` (narrows the 402's `required`/`balance` off `ApiError.details`, same split as `delete-account`'s `readPurgeAfter`).
- `src/pages/me` — the 크레딧 screen (`ui/me-credits-page.tsx`), the tab-root summary row, and the user-facing copy for reasons, phases, and refusals.
- Route: `src/app/settings/credits.tsx` (thin re-export), registered on the root stack with a titled header (크레딧).

## Platform support

All current behavior is JavaScript-only and runs on iOS, Android, and web alike. The real rewarded-ad SDK will be native-only when it lands; the provider seam is where the web variant will answer `unavailable`.

## Known limitations

- **No ad SDK, so no credit can actually be earned** — the blocking gap, detailed in [Required to finish](#required-to-finish-admob-integration).
- With no API origin configured (`USE_MOCK_API`) the whole feature runs against in-code mocks, including a mock reward server that grants after one `pending` poll; that mock ledger resets on reload.
- No purchase path (see the table row above), and therefore no restore-purchases either.
- The movie screen does not yet show the balance or the 100-credit cost *before* the generate press — the cost is still discovered on refusal. That read-out is owed when the paid flow goes live (see [The movie screen](movie.md), "How many runs a user gets").
