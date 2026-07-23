import type { CaptureMood } from '@/entities/capture-session/@x/clip';

/**
 * Orientation of a captured clip. Detection is minimal for the MVP (portrait is
 * the default); accurate detection lands with the wide-roll work (concept §3).
 */
export type ClipOrientation = 'portrait' | 'landscape' | 'square';

/**
 * A captured moment — the immutable "negative". The underlying video file lives
 * on disk (see `shared/lib/recording-files`, addressed by `uri`); this is the
 * metadata a clip carries on top of that file. Clips are referenced by rolls
 * (N:M) and are never mutated by roll edits — trim/order live on the roll's
 * clip references (see `entities/roll`).
 */
export type Clip = {
  id: string;
  /** File URI of the source video, as returned by `recording-files`. */
  uri: string;
  durationSec: number;
  mood?: CaptureMood;
  /** Epoch milliseconds when the moment was captured. */
  capturedAt: number;
  width: number;
  height: number;
  orientation: ClipOrientation;
  tags: string[];
};
