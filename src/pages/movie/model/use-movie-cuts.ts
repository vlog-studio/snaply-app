import { useMemo, useState } from 'react';

import {
  MovieSnapLimit,
  cutDurationSec,
  cutsDurationSec,
  useMovieById,
  withTrim,
  withoutTrim,
  type Movie,
  type SnapRef,
} from '@/entities/movie';
import { canEditMovie, useComposeMovie, type CutsRefusal } from '@/features/compose-movie';
import { useSnapIndex, type Snap } from '@/entities/snap';

/** One row of the cut list: the cut, the snap behind it, and its position. */
export type Cut = {
  ref: SnapRef;
  /**
   * The original this cut points at, or `undefined` when it was deleted. The row
   * still exists — the user has to be able to see and remove a dead cut.
   */
  snap: Snap | undefined;
  /** How long this cut plays: its trim window, or the whole snap. */
  usedSec: number;
};

export type MovieCuts = {
  movie: Movie | undefined;
  /** The working cut list; edits are local until `save` commits them. */
  cuts: Cut[];
  /** How long the working cut list plays, in seconds. */
  totalSec: number;
  /** Whether the working list differs from what is stored. */
  isDirty: boolean;
  /** False until the movie has been generated, and while a job owns it. */
  canEdit: boolean;
  /** Set when the last commit or edit was refused. */
  refusal: CutsRefusal | undefined;
  moveCut: (index: number, direction: -1 | 1) => void;
  removeCut: (index: number) => void;
  /** Sets a cut's trim window. The rules are the entity's; this only stores. */
  trimCut: (index: number, startSec: number, endSec: number) => void;
  /** Puts a cut back to playing whole. */
  resetTrim: (index: number) => void;
  /** Commits the working list. Answers whether the commit landed. */
  save: () => boolean;
  discard: () => void;
};

function sameTrim(left: SnapRef, right: SnapRef): boolean {
  return left.trim?.startSec === right.trim?.startSec && left.trim?.endSec === right.trim?.endSec;
}

function sameRefs(left: readonly SnapRef[], right: readonly SnapRef[]): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (ref, index) => ref.snapId === right[index].snapId && sameTrim(ref, right[index]),
  );
}

/**
 * The cut list's working state: reordered and pruned locally, committed as one
 * write.
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
export function useMovieCuts(movieId: string | undefined): MovieCuts {
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
  // The rule is the feature's, not this hook's: a screen that decided for itself
  // which statuses are editable would be one release away from disagreeing with
  // the commit that has the final say.
  const canEdit = movie !== undefined && canEditMovie(movie);

  const cuts = useMemo(
    () =>
      refs.map((ref) => {
        const snap = snapIndex.get(ref.snapId);
        return { ref, snap, usedSec: snap ? cutDurationSec(ref, snap.durationSec) : 0 };
      }),
    [refs, snapIndex],
  );
  const totalSec = useMemo(
    () => cutsDurationSec(refs, (snapId) => snapIndex.get(snapId)?.durationSec),
    [refs, snapIndex],
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

  const replaceCut = (index: number, change: (ref: SnapRef, snap: Snap) => SnapRef) => {
    const snap = snapIndex.get(refs[index]?.snapId ?? '');
    if (!snap) return;
    const next = [...refs];
    next[index] = change(next[index], snap);
    if (next[index] === refs[index]) return;
    setRefusal(undefined);
    setWorkingRefs(next);
  };

  const trimCut = (index: number, startSec: number, endSec: number) =>
    replaceCut(index, (ref, snap) => {
      const trimmed = withTrim(ref, startSec, endSec, snap.durationSec);
      // `withTrim` builds a new object even for an unchanged window; comparing the
      // window keeps a settled drag that moved nothing from marking the list
      // dirty and offering to save the same list back.
      return sameTrim(ref, trimmed) ? ref : trimmed;
    });

  const resetTrim = (index: number) => replaceCut(index, (ref) => withoutTrim(ref));

  const save = (): boolean => {
    if (!movieId) return false;
    if (!workingRefs) return true;
    const outcome = saveCuts(movieId, workingRefs);
    setRefusal(outcome.refused);
    // On success the store write moves `storedRefs`, which abandons the branch
    // above; clearing here would race that. Only a refusal has to keep the
    // working copy so the user can fix it.
    return outcome.refused === undefined;
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
    trimCut,
    resetTrim,
    save,
    discard,
  };
}

/** How many more snaps this movie can take. */
export function remainingCutRoom(cutCount: number): number {
  return Math.max(MovieSnapLimit - cutCount, 0);
}
