import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteLocalRecording,
  listLocalRecordings,
  persistLocalRecording,
  type LocalRecording,
} from '@/shared/lib/recording-files';
import { deleteRecordingThumbnail } from '@/shared/lib/recording-thumbnails';

export function useLocalRecordings() {
  const isMounted = useRef(true);
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>();
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string>();

  const reloadRecordings = useCallback(async () => {
    try {
      const storedRecordings = await listLocalRecordings();
      if (isMounted.current) {
        setRecordings(storedRecordings);
        setErrorMessage(undefined);
      }
    } catch {
      if (isMounted.current) setErrorMessage('저장된 영상 목록을 불러오지 못했어요.');
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    void listLocalRecordings()
      .then((storedRecordings) => {
        if (isMounted.current) {
          setRecordings(storedRecordings);
          setErrorMessage(undefined);
        }
      })
      .catch(() => {
        if (isMounted.current) setErrorMessage('저장된 영상 목록을 불러오지 못했어요.');
      })
      .finally(() => {
        if (isMounted.current) setIsLoading(false);
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const saveRecording = async (temporaryUri: string) => {
    try {
      const recording = await persistLocalRecording(temporaryUri);
      if (isMounted.current) {
        setRecordings((current) => [recording, ...current]);
        setErrorMessage(undefined);
      }
      return recording;
    } catch {
      if (isMounted.current)
        setErrorMessage('촬영한 영상을 저장하지 못했어요. 다시 시도해 주세요.');
      return undefined;
    }
  };

  const removeRecording = async (recording: LocalRecording) => {
    setDeletingId(recording.id);

    try {
      await deleteLocalRecording(recording.uri);
      deleteRecordingThumbnail(recording);
      if (isMounted.current) {
        setRecordings((current) => current.filter((item) => item.id !== recording.id));
        setErrorMessage(undefined);
      }
      return true;
    } catch {
      if (isMounted.current) setErrorMessage('영상을 삭제하지 못했어요.');
      return false;
    } finally {
      if (isMounted.current) setDeletingId(undefined);
    }
  };

  const removeRecordings = async (targets: readonly LocalRecording[]) => {
    if (targets.length === 0) return true;

    setDeletingIds(new Set(targets.map((item) => item.id)));

    const deletedIds: string[] = [];
    let hadFailure = false;

    // Delete sequentially so a mid-batch failure still commits the clips that
    // did succeed, then update state once to avoid N re-renders.
    for (const target of targets) {
      try {
        await deleteLocalRecording(target.uri);
        deleteRecordingThumbnail(target);
        deletedIds.push(target.id);
      } catch {
        hadFailure = true;
      }
    }

    if (isMounted.current) {
      if (deletedIds.length > 0) {
        const deletedIdSet = new Set(deletedIds);
        setRecordings((current) => current.filter((item) => !deletedIdSet.has(item.id)));
      }
      setErrorMessage(hadFailure ? '일부 컷을 삭제하지 못했어요.' : undefined);
      setDeletingIds(new Set());
    }

    return !hadFailure;
  };

  return {
    recordings,
    isLoading,
    deletingId,
    deletingIds,
    errorMessage,
    clearError: () => setErrorMessage(undefined),
    reloadRecordings,
    saveRecording,
    removeRecording,
    removeRecordings,
  };
}
