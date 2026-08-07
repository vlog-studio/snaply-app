import { z } from 'zod';

import { apiPath, apiRequest } from '@/shared/api';
import { USE_MOCK_API } from '@/shared/config/api';

async function deleteFromApi(videoId: string, signal?: AbortSignal): Promise<void> {
  await apiRequest(apiPath('/videos/{id}', { id: videoId }), {
    method: 'DELETE',
    schema: z.unknown(),
    signal,
  });
}

function deleteMock(videoId: string): Promise<void> {
  if (__DEV__) console.log(`[upload-snap][mock] remote video deleted: ${videoId}`);
  return Promise.resolve();
}

/**
 * Delete a snap's remote copy (`DELETE /videos/{id}`). Called by the upload
 * worker when it drains the delete tombstones that `features/delete-snap`
 * leaves behind. Routes to the mock until an API origin is configured.
 */
export function deleteRemoteVideo(videoId: string, signal?: AbortSignal): Promise<void> {
  return USE_MOCK_API ? deleteMock(videoId) : deleteFromApi(videoId, signal);
}
