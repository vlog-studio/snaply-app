import { useState } from 'react';

import type { CaptureDuration, CaptureMood } from '@/entities/capture-session';
import { useAddClip, type Clip } from '@/entities/clip';
import { ensureDailyRoll, useAddClipToRoll } from '@/entities/roll';
import { persistLocalRecording } from '@/shared/lib/recording-files';

import { createClip } from './create-clip';

const CAPTURE_MOMENT_FAILED = '순간을 담지 못했어요. 다시 시도해 주세요.'; // 순간을 담지 못했어요.

type CaptureMomentInput = {
  durationSec: CaptureDuration;
  mood?: CaptureMood;
};

/**
 * The "담기" action: persist a captured moment's video file, create its clip
 * metadata, and add the clip to today's daily roll (creating that roll on the
 * first capture of the day). Owns its pending/error state and guards re-entry;
 * it never navigates — the caller decides where to go on success (the recorder
 * returns Home, where the roll counter reflects the new clip).
 */
export function useCaptureMoment() {
  const addClip = useAddClip();
  const addClipToRoll = useAddClipToRoll();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function captureMoment(
    temporaryUri: string,
    input: CaptureMomentInput,
  ): Promise<Clip | null> {
    if (isSaving) return null;
    setIsSaving(true);
    setError(null);
    try {
      const recording = await persistLocalRecording(temporaryUri);
      const clip = createClip(recording, input);
      addClip(clip);
      const todayRoll = ensureDailyRoll();
      addClipToRoll(todayRoll.id, clip.id);
      return clip;
    } catch {
      setError(CAPTURE_MOMENT_FAILED);
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  return { captureMoment, isSaving, error, clearError: () => setError(null) };
}
