import { useCallback, useState } from 'react';

import { getClipsByIds } from '@/entities/clip';
import { getRollById, useSetRollReel, useSetRollStatus } from '@/entities/roll';

import { composeReel } from './compose-reel';

const DEVELOP_FAILED = '현상하지 못했어요. 다시 시도해 주세요.'; // 현상하지 못했어요.

/**
 * The 현상 (develop) action: composes a roll's clips into a reel (rules-based
 * auto-combine) and persists it, moving the roll `undeveloped → developing →
 * developed`. Synchronous local work today; the async status exists so a future
 * server-side develop can surface real pending state. Reads the roll and its
 * clips at call time (non-reactive) so a stale closure never composes an old
 * roll.
 */
export function useDevelopRoll() {
  const setRollStatus = useSetRollStatus();
  const setRollReel = useSetRollReel();
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const develop = useCallback(
    (rollId: string): boolean => {
      const roll = getRollById(rollId);
      const clips = roll ? getClipsByIds(roll.clipRefs.map((ref) => ref.clipId)) : [];
      if (!roll || clips.length === 0) {
        setError(DEVELOP_FAILED);
        return false;
      }

      setIsDeveloping(true);
      setError(null);
      try {
        setRollStatus(rollId, 'developing');
        setRollReel(rollId, composeReel(roll, clips, Date.now()));
        setRollStatus(rollId, 'developed');
        return true;
      } finally {
        setIsDeveloping(false);
      }
    },
    [setRollReel, setRollStatus],
  );

  return { develop, isDeveloping, error, clearError: () => setError(null) };
}
