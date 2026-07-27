import { useCallback, useEffect, useRef, useState } from 'react';

import { useRemoveClips } from '@/entities/clip';
import { useRemoveClipsEverywhere } from '@/entities/roll';
import { deleteLocalRecording } from '@/shared/lib/recording-files';
import { deleteVideoThumbnail } from '@/shared/lib/video-thumbnails';

const PartialFailureMessage = '일부 컷을 삭제하지 못했어요.'; // 일부 컷을 삭제하지 못했어요.
const TotalFailureMessage = '컷을 삭제하지 못했어요.'; // 컷을 삭제하지 못했어요.

/**
 * The minimum a delete needs to know: which clip, and where its file is. Stated
 * structurally so both a `Clip` (what the archive holds) and a `LocalRecording`
 * (what the capture library holds) can be handed to it directly.
 */
export type DeletableClip = { id: string; uri: string };

/**
 * Deletes originals from the archive, permanently and completely.
 *
 * A clip exists in four places — the video file, its cached thumbnail, its clip
 * metadata, and the references rolls hold to it — so deleting only the file
 * leaves rolls (and already-composed reels) pointing at a video that is gone.
 * This action removes all four, which is why it is a feature composing two
 * entities rather than a call on either one.
 *
 * Order matters. The file is deleted first because it is the irreversible,
 * failure-prone step: if it fails, nothing else has changed yet and the clip
 * stays whole. The metadata for everything that did succeed is then committed
 * in one synchronous block, so an interruption cannot leave a clip whose file
 * is gone but whose roll references remain.
 *
 * Removing a clip from a single roll while keeping the original is a different
 * action (`removeClipFromRoll`); this one takes the clip out of every roll.
 */
export function useDeleteClips() {
  const isMounted = useRef(true);
  const removeClips = useRemoveClips();
  const removeClipsEverywhere = useRemoveClipsEverywhere();
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /** Returns the ids actually deleted, so the caller can refresh its list. */
  const deleteClips = useCallback(
    async (targets: readonly DeletableClip[]): Promise<string[]> => {
      if (targets.length === 0) return [];

      setDeletingIds(new Set(targets.map((target) => target.id)));

      const deletedIds: string[] = [];
      let hadFailure = false;

      // Sequential, so a mid-batch failure still commits the clips that did
      // succeed instead of aborting the whole batch.
      for (const target of targets) {
        try {
          await deleteLocalRecording(target.uri);
          deletedIds.push(target.id);
        } catch {
          hadFailure = true;
          continue;
        }
        try {
          deleteVideoThumbnail(target.uri);
        } catch {
          // The thumbnail is a derived cache, so losing it only forces
          // re-extraction. Failing to clear it must never turn a completed
          // delete into a failed one — that would strand the clip's metadata
          // and roll references pointing at a file that is already gone.
        }
      }

      // Roll references first, then the clip metadata: both are synchronous
      // store writes, and this order never leaves a roll referencing a clip
      // the archive no longer knows about. Run even when the component has
      // unmounted — the files are already gone, so the stores must catch up.
      if (deletedIds.length > 0) {
        removeClipsEverywhere(deletedIds);
        removeClips(deletedIds);
      }

      if (isMounted.current) {
        setDeletingIds(new Set());
        if (!hadFailure) setErrorMessage(undefined);
        else setErrorMessage(deletedIds.length > 0 ? PartialFailureMessage : TotalFailureMessage);
      }

      return deletedIds;
    },
    [removeClips, removeClipsEverywhere],
  );

  return {
    deleteClips,
    deletingIds,
    errorMessage,
    clearError: () => setErrorMessage(undefined),
  };
}
