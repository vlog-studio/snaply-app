import { useMemo, useState } from 'react';

import { MovieSnapLimit, useMovieById, type Movie, type SnapRef } from '@/entities/movie';
import { useComposeMovie, type CutsRefusal } from '@/features/compose-movie';
import { useSnapIndex, type Snap } from '@/entities/snap';

/** One row of the assemble step: the cut, the snap behind it, and its position. */
export type Cut = {
  ref: SnapRef;
  /**
   * The original this cut points at, or `undefined` when it was deleted. The row
   * still exists — the user has to be able to see and remove a dead cut.
   */
  snap: Snap | undefined;
};

export type MovieEditor = {
  movie: Movie | undefined;
  /** The working cut list; edits are local until `save` commits them. */
  cuts: Cut[];
  /** Total length of the resolved cuts, in seconds. */
  totalSec: number;
  /** Whether the working list differs from what is stored. */
  isDirty: boolean;
  /** False once a generation job owns the movie. */
  canEdit: boolean;
  /** Set when the last commit or edit was refused. */
  refusal: CutsRefusal | undefined;
  moveCut: (index: number, direction: -1 | 1) => void;
  removeCut: (index: number) => void;
  save: () => void;
  discard: () => void;
};

function sameRefs(left: readonly SnapRef[], right: readonly SnapRef[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((ref, index) => {
    const other = right[index];
    return (
      ref.snapId === other.snapId &&
      ref.trim?.startSec === other.trim?.startSec &&
      ref.trim?.endSec === other.trim?.endSec
    );
  });
}

/**
 * The assemble step's working state: the movie's cut list, reordered and pruned
 * locally, committed as one write.
 *
 * Edits are local rather than written per tap for one reason — a movie must keep
 * at least one cut, and a per-tap store write would have to refuse the last
 * removal in the middle of a gesture. Held locally, the rule is a disabled
 * control instead, and the single commit is what `features/compose-movie`
 * validates.
 *
 * The stored order is the source of truth on mount and after every save; local
 * edits are layered on top and dropped by `discard`.
 */
export function useMovieEditor(movieId: string | undefined): MovieEditor {
  const movie = useMovieById(movieId);
  const snapIndex = useSnapIndex();
  const { saveCuts } = useComposeMovie();

  const storedRefs = useMemo(
    () => (movie ? [...movie.snapRefs].sort((left, right) => left.order - right.order) : []),
    [movie],
  );

  // Local edits, or `undefined` while the working list still matches the store.
  const [workingRefs, setWorkingRefs] = useState<SnapRef[]>();
  const [refusal, setRefusal] = useState<CutsRefusal>();
  // The stored list this working copy was branched from. When the store moves
  // underneath (a save, or a snap deleted elsewhere), the branch is abandoned
  // rather than replayed onto a list it no longer describes.
  const [branchedFrom, setBranchedFrom] = useState<readonly SnapRef[]>(storedRefs);
  if (branchedFrom !== storedRefs) {
    setBranchedFrom(storedRefs);
    setWorkingRefs(undefined);
    setRefusal(undefined);
  }

  const refs = workingRefs ?? storedRefs;
  const canEdit = movie?.status === 'draft' || movie?.status === 'failed';

  const cuts = useMemo(
    () => refs.map((ref) => ({ ref, snap: snapIndex.get(ref.snapId) })),
    [refs, snapIndex],
  );
  const totalSec = useMemo(
    () => cuts.reduce((sum, cut) => sum + (cut.snap?.durationSec ?? 0), 0),
    [cuts],
  );

  const moveCut = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= refs.length) return;
    const next = [...refs];
    [next[index], next[target]] = [next[target], next[index]];
    setRefusal(undefined);
    setWorkingRefs(next);
  };

  const removeCut = (index: number) => {
    if (refs.length <= 1) {
      setRefusal('empty');
      return;
    }
    setRefusal(undefined);
    setWorkingRefs(refs.filter((_, position) => position !== index));
  };

  const save = () => {
    if (!movieId || !workingRefs) return;
    const outcome = saveCuts(movieId, workingRefs);
    setRefusal(outcome.refused);
    // On success the store write moves `storedRefs`, which abandons the branch
    // above; clearing here would race that. Only a refusal has to keep the
    // working copy so the user can fix it.
  };

  const discard = () => {
    setWorkingRefs(undefined);
    setRefusal(undefined);
  };

  return {
    movie,
    cuts,
    totalSec,
    isDirty: workingRefs !== undefined && !sameRefs(workingRefs, storedRefs),
    canEdit,
    refusal,
    moveCut,
    removeCut,
    save,
    discard,
  };
}

/** How many more snaps this movie can take. */
export function remainingCutRoom(cutCount: number): number {
  return Math.max(MovieSnapLimit - cutCount, 0);
}
