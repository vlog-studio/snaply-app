import { queryOptions } from '@tanstack/react-query';

import { getEditedVideo } from './get-edited-video';

/**
 * Query factory for a run's result row (`GET /videos/{id}`).
 *
 * Asked for at watch time, not only at finish time: the URLs the row carries
 * are time-limited links to a private bucket, so a stored one goes stale and
 * the durable way to play or export the file is to ask for a fresh link by the
 * result's id. `staleTime: 0` is that rule as cache policy — every mount asks
 * again, and what expires is never served from cache as if it were good.
 */
export const editedVideoQueries = {
  all: () => ['edited-video'] as const,
  byId: (videoId: string) =>
    queryOptions({
      queryKey: [...editedVideoQueries.all(), videoId] as const,
      queryFn: ({ signal }) => getEditedVideo(videoId, signal),
      staleTime: 0,
    }),
};
