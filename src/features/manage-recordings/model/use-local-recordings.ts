import { useCallback, useEffect, useRef, useState } from 'react';

import {
  deleteLocalRecording,
  listLocalRecordings,
  persistLocalRecording,
  type LocalRecording,
} from '@/shared/lib/recording-files';

export function useLocalRecordings() {
  const isMounted = useRef(true);
  const [recordings, setRecordings] = useState<LocalRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>();
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
      if (isMounted.current) setErrorMessage('촬영한 영상을 저장하지 못했어요. 다시 시도해 주세요.');
      return undefined;
    }
  };

  const removeRecording = async (recording: LocalRecording) => {
    setDeletingId(recording.id);

    try {
      await deleteLocalRecording(recording.uri);
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

  return {
    recordings,
    isLoading,
    deletingId,
    errorMessage,
    clearError: () => setErrorMessage(undefined),
    reloadRecordings,
    saveRecording,
    removeRecording,
  };
}
