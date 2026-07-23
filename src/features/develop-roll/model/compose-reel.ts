import type { CaptureMood } from '@/entities/capture-session';
import type { Clip } from '@/entities/clip';
import type { Reel, Roll } from '@/entities/roll';

// Rules-based BGM per dominant mood. These are placeholder track identifiers;
// the MVP does not play real audio (mvp-implementation-plan.md §5: rules-based
// order + BGM/transition metadata, real AI/audio later).
const BGM_BY_MOOD: Record<CaptureMood, string> = {
  hip: 'darkroom-hip',
  lovely: 'darkroom-lovely',
  energy: 'darkroom-energy',
};
const DEFAULT_BGM = 'darkroom-ambient';

/** Longer rolls cut fast; short rolls breathe with a fade. */
const CUT_THRESHOLD = 4;

function dominantMood(clips: Clip[]): CaptureMood | undefined {
  const counts = new Map<CaptureMood, number>();
  for (const clip of clips) {
    if (clip.mood) counts.set(clip.mood, (counts.get(clip.mood) ?? 0) + 1);
  }
  let winner: CaptureMood | undefined;
  let best = 0;
  for (const [mood, count] of counts) {
    if (count > best) {
      best = count;
      winner = mood;
    }
  }
  return winner;
}

/**
 * Composes a roll's clips into a reel: the ordered clip references plus
 * rules-based BGM and transition metadata. This is the MVP "auto-combine" — a
 * deterministic rule, not an AI edit. The reel is a sequential playlist, not a
 * rendered single file (the reel player plays the clips in order).
 *
 * Pure: `developedAt` is injected so the result is deterministic in tests.
 */
export function composeReel(roll: Roll, clips: Clip[], developedAt: number): Reel {
  const clipRefs = [...roll.clipRefs].sort((left, right) => left.order - right.order);
  const mood = dominantMood(clips);

  return {
    clipRefs,
    bgm: mood ? BGM_BY_MOOD[mood] : DEFAULT_BGM,
    transition: clips.length >= CUT_THRESHOLD ? 'cut' : 'fade',
    developedAt,
  };
}
