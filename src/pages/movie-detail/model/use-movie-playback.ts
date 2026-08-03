import { useMemo } from 'react';

import { useMovieById, type Movie } from '@/entities/movie';
import { useSnapIndex } from '@/entities/snap';

/** One cut as the player needs it: a file, and the window of it that plays. */
export type PlaybackCut = {
  snapId: string;
  uri: string;
  /** Seconds into the file where this cut starts. */
  startSec: number;
  /** Seconds into the file where it ends; the player advances here. */
  endSec: number;
};

export type MoviePlayback = {
  movie: Movie | undefined;
  /** The cuts to play, in order. Empty when nothing is playable. */
  cuts: PlaybackCut[];
  /** How long the whole movie runs. */
  totalSec: number;
};

/**
 * A movie resolved into a playlist.
 *
 * A finished movie has no rendered file — no compositing backend exists — so
 * "playing the movie" means playing its cuts back to back, each within its trim
 * window. That is the same list the editor assembled, which is the point: the
 * order and lengths the user chose are what they get back (concept §6).
 *
 * A cut whose original was deleted is dropped rather than shown as a gap. The
 * editor is where a movie's missing cuts are dealt with; playback can only skip.
 */
export function useMoviePlayback(movieId: string | undefined): MoviePlayback {
  const movie = useMovieById(movieId);
  const snapIndex = useSnapIndex();

  const cuts = useMemo(() => {
    if (!movie) return [];
    return [...movie.snapRefs]
      .sort((left, right) => left.order - right.order)
      .flatMap<PlaybackCut>((ref) => {
        const snap = snapIndex.get(ref.snapId);
        if (!snap) return [];
        return [
          {
            snapId: snap.id,
            uri: snap.uri,
            startSec: ref.trim?.startSec ?? 0,
            endSec: ref.trim?.endSec ?? snap.durationSec,
          },
        ];
      });
  }, [movie, snapIndex]);

  const totalSec = useMemo(
    () => cuts.reduce((sum, cut) => sum + (cut.endSec - cut.startSec), 0),
    [cuts],
  );

  return { movie, cuts, totalSec };
}
