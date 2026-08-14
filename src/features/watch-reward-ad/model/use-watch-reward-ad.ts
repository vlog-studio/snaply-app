import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { creditQueries } from '@/entities/credit';
import { ApiError } from '@/shared/api';

import { getAdRewardStatus } from '../api/get-ad-reward-status';
import { adRewardQueries } from '../api/ad-reward.queries';
import { startAdReward } from '../api/start-ad-reward';
import { mockRewardAdProvider } from './mock-reward-ad-provider';
import type { RewardAdProvider } from './reward-ad-provider';

/**
 * Why no credits arrived, or `undefined` when they did.
 *
 * `disabled` — the server's kill switch is off; the entry point should not
 * have been visible, so this is also what stale UI gets told.
 * `cooldown` / `limit` — the server refused a new session; both are the
 * server's counters, never the app's.
 * `dismissed` — the user closed the ad before its reward point. Their call;
 * nothing to apologize for.
 * `unavailable` — no ad to show, or the server rejected/expired the session.
 * `pending` — the ad completed but the grant had not landed when the app
 * stopped watching. **Not a failure**: the credits may still arrive, and the
 * balance was already asked to refetch — the screen must not say "failed".
 * `unreachable` — a request failed; nothing was consumed, retry is recovery.
 */
export type AdRewardRefusal =
  'disabled' | 'cooldown' | 'limit' | 'dismissed' | 'unavailable' | 'pending' | 'unreachable';

export type WatchRewardAdOutcome = {
  granted: boolean;
  /** Credits granted, when they were. */
  credits?: number;
  refused?: AdRewardRefusal;
};

/**
 * Where the flow currently stands, for the button to narrate: `preparing`
 * (issuing the session), `showing` (the ad is up), `settling` (polling for
 * the grant). `idle` between runs, whatever the last outcome was.
 */
export type WatchRewardAdPhase = 'idle' | 'preparing' | 'showing' | 'settling';

/** Session-refusal codes the backend answers `POST /billing/ad-rewards` with. */
const startRefusals: Record<string, AdRewardRefusal> = {
  AD_REWARD_COOLDOWN: 'cooldown',
  AD_REWARD_LIMIT_REACHED: 'limit',
  AD_REWARDS_DISABLED: 'disabled',
};

/** How long and how often to ask whether the grant landed. */
const SETTLE_POLL_INTERVAL_MS = 1500;
const SETTLE_POLL_ATTEMPTS = 7;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// One place selects the concrete provider; the AdMob implementation slots in
// here when the SDK lands, and nothing above this line changes.
const rewardAdProvider: RewardAdProvider = mockRewardAdProvider;

/**
 * The whole rewarded-ad flow as one call: issue a session, show the ad with
 * the session's nonce aboard, then poll until the server says the grant
 * landed.
 *
 * The app never tells the server "the ad was watched" — there is no such
 * request to make. The grant is written when the ad network's server-side
 * callback (SSV) reaches the backend, which is why the last leg is a bounded
 * poll and why `pending` is a normal outcome rather than a failure. Both
 * query families are invalidated on every settle, even `pending`: the balance
 * may already be newer than what is cached, and a grant that lands after the
 * window is picked up by the next refetch.
 */
export function useWatchRewardAd() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<WatchRewardAdPhase>('idle');
  const runningRef = useRef(false);

  const settle = useCallback(async (rewardId: string): Promise<WatchRewardAdOutcome> => {
    for (let attempt = 0; attempt < SETTLE_POLL_ATTEMPTS; attempt++) {
      if (attempt > 0) await delay(SETTLE_POLL_INTERVAL_MS);
      let status;
      try {
        status = await getAdRewardStatus(rewardId);
      } catch {
        // One missed poll is not an answer; the next one may be.
        continue;
      }
      if (status.status === 'granted') return { granted: true, credits: status.credits };
      if (status.status === 'rejected' || status.status === 'expired') {
        return { granted: false, refused: 'unavailable' };
      }
    }
    return { granted: false, refused: 'pending' };
  }, []);

  const watchAd = useCallback(async (): Promise<WatchRewardAdOutcome> => {
    if (runningRef.current) return { granted: false, refused: 'pending' };
    runningRef.current = true;
    try {
      setPhase('preparing');

      let session;
      try {
        session = await startAdReward();
      } catch (error) {
        if (error instanceof ApiError) {
          const refused = startRefusals[error.code];
          if (refused) return { granted: false, refused };
          // A session is already pending — most likely this user's previous
          // ad, still waiting on its callback. There is no nonce to show a
          // new ad with, but the old session can still settle, so watch it
          // instead of refusing outright.
          if (error.code === 'AD_REWARD_SESSION_ACTIVE') {
            const rewardId = error.details?.rewardId;
            if (typeof rewardId === 'string') {
              setPhase('settling');
              const outcome = await settle(rewardId);
              await invalidateRewardQueries(queryClient);
              return outcome;
            }
          }
        }
        return { granted: false, refused: 'unreachable' };
      }

      setPhase('showing');
      const result = await rewardAdProvider.show({
        nonce: session.nonce,
        ssvUserId: session.ssvUserId,
      });
      if (result !== 'earned') {
        return { granted: false, refused: result === 'dismissed' ? 'dismissed' : 'unavailable' };
      }

      setPhase('settling');
      const outcome = await settle(session.rewardId);
      await invalidateRewardQueries(queryClient);
      return outcome;
    } finally {
      setPhase('idle');
      runningRef.current = false;
    }
  }, [queryClient, settle]);

  return { watchAd, phase };
}

function invalidateRewardQueries(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: creditQueries.all() }),
    queryClient.invalidateQueries({ queryKey: adRewardQueries.all() }),
  ]).then(() => undefined);
}
