import { grantMockCredits, readMockCreditBalance } from '@/entities/credit';

import type { AdRewardAvailability, AdRewardSession, AdRewardStatus } from '../model/ad-reward';

/**
 * The mock reward backend: issues sessions, answers one `pending` poll before
 * granting (so the settling state is actually exercised in development), and
 * counts a daily limit — the same states the real backend answers with, minus
 * the ad network. Grants land in the mock credit ledger, so the balance the
 * screens show moves. Replaced by the real `/billing/ad-rewards` endpoints
 * once an API origin is configured.
 */
const MOCK_REWARD_CREDITS = 20;
const MOCK_DAILY_LIMIT = 3;
const SESSION_TTL_MS = 15 * 60 * 1000;

let nextSessionNumber = 1;
let grantedToday = 0;
/** rewardId → how many status polls have answered, to stage pending → granted. */
const pollCounts = new Map<string, number>();
const granted = new Set<string>();

function endOfToday(): Date {
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  return end;
}

export function mockAdRewardAvailability(): AdRewardAvailability {
  return {
    enabled: true,
    rewardCredits: MOCK_REWARD_CREDITS,
    dailyLimit: MOCK_DAILY_LIMIT,
    remainingToday: Math.max(0, MOCK_DAILY_LIMIT - grantedToday),
    resetsAt: endOfToday(),
  };
}

export function mockStartAdReward(): AdRewardSession {
  const sessionNumber = nextSessionNumber++;
  return {
    rewardId: `mock-reward-${sessionNumber}`,
    nonce: `mock-nonce-${sessionNumber}`,
    ssvUserId: 'mock-user',
    rewardCredits: MOCK_REWARD_CREDITS,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  };
}

export function mockAdRewardStatus(rewardId: string): AdRewardStatus {
  const polls = (pollCounts.get(rewardId) ?? 0) + 1;
  pollCounts.set(rewardId, polls);

  // First poll answers `pending`, as the real SSV round trip would; the grant
  // itself happens exactly once per session however often it is polled after.
  if (polls === 1) {
    return { rewardId, status: 'pending', balance: readMockCreditBalance().balance };
  }
  if (!granted.has(rewardId)) {
    granted.add(rewardId);
    grantedToday += 1;
    return {
      rewardId,
      status: 'granted',
      credits: MOCK_REWARD_CREDITS,
      balance: grantMockCredits(MOCK_REWARD_CREDITS, 'ad_reward'),
    };
  }
  return {
    rewardId,
    status: 'granted',
    credits: MOCK_REWARD_CREDITS,
    balance: readMockCreditBalance().balance,
  };
}
