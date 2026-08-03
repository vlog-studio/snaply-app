import { useState } from 'react';

import type { CaptureDuration } from '@/entities/capture-session';
import { useAddSnap, type Snap } from '@/entities/snap';
import { persistLocalRecording } from '@/shared/lib/recording-files';

import { readCapturePlace } from '../lib/read-capture-place';

import { createSnap } from './create-snap';

const CAPTURE_MOMENT_FAILED = '순간을 담지 못했어요. 다시 시도해 주세요.'; // 순간을 담지 못했어요.

type CaptureMomentInput = {
  durationSec: CaptureDuration;
};

/**
 * The capture action: persist a recorded moment's video file and create its snap
 * metadata, tagged with where it was shot when that can be answered.
 *
 * That is the whole job. Capturing no longer files the snap into anything —
 * automatic collection is gone along with the daily roll and its all-day rule. A
 * snap sits in the library until the user picks it into the tray, which is now
 * the one place material is chosen (concept §5).
 *
 * Owns its pending/error state and guards re-entry; it never navigates — the
 * caller decides where to go on success (the recorder stays on the viewfinder,
 * ready for the next hold).
 */
export function useCaptureMoment() {
  const addSnap = useAddSnap();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function captureMoment(
    temporaryUri: string,
    input: CaptureMomentInput,
  ): Promise<Snap | null> {
    if (isSaving) return null;
    setIsSaving(true);
    setError(null);
    try {
      // Both reads run together: a coordinate must never add its latency on top
      // of the file move, and it must never be able to fail the capture.
      const [recording, place] = await Promise.all([
        persistLocalRecording(temporaryUri),
        readCapturePlace(),
      ]);
      const snap = createSnap(recording, { ...input, place });
      addSnap(snap);
      return snap;
    } catch {
      setError(CAPTURE_MOMENT_FAILED);
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  return { captureMoment, isSaving, error, clearError: () => setError(null) };
}
