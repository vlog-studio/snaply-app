import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useDevelopRoll } from '@/features/develop-roll';
import { useRollById } from '@/entities/roll';
import { useReducedMotion } from '@/shared/ui/theme';

const TICK_MS = 90;
const STEP = 4;

/**
 * Drives the develop ceremony: a progress animation whose completion triggers
 * the real develop (compose + persist the reel via `develop-roll`). The
 * animation is the perceived "developing" state; the store transition happens
 * once, guarded by a ref so a re-render never re-develops. On completion the
 * caller reveals the reel (navigate to the result screen).
 */
export function useDevelopCeremony(rollId: string | undefined) {
  const router = useRouter();
  const roll = useRollById(rollId);
  const { develop } = useDevelopRoll();
  const reducedMotion = useReducedMotion();
  const [rawProgress, setRawProgress] = useState(0);
  const hasDeveloped = useRef(false);

  useEffect(() => {
    // Reduced motion: skip the scan/bloom timer; `progress` is derived as 100.
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setRawProgress((current) => {
        const next = Math.min(current + STEP, 100);
        if (next === 100) clearInterval(timer);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const progress = reducedMotion ? 100 : rawProgress;
  const isComplete = progress === 100;

  useEffect(() => {
    if (isComplete && rollId && !hasDeveloped.current) {
      hasDeveloped.current = true;
      develop(rollId);
    }
  }, [isComplete, rollId, develop]);

  const revealReel = () => {
    if (!rollId) return;
    router.replace({ pathname: '/capture/result', params: { rollId } });
  };

  return {
    roll,
    clipCount: roll?.clipRefs.length ?? 0,
    progress,
    isComplete,
    revealReel,
  };
}
