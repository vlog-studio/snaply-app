import { useQuery } from '@tanstack/react-query';

import type { Movie } from '@/entities/movie';

import { editedVideoQueries } from '../api/edited-video.queries';

/**
 * What watch mode should play for this movie's render, resolved now.
 *
 * `uri` — the file's address, fresh when the render remembers its result id.
 * `resolving` — a fresh address is still being asked for; the stage shows its
 * loading face rather than opening a link already known to be second-hand.
 */
export type RenderSource = {
  uri: string | undefined;
  resolving: boolean;
};

/**
 * Resolves the movie's rendered file to an address that is good *now*.
 *
 * The stored `render.uri` is whatever the finish-time lookup got, and the
 * backend hands out time-limited links to a private bucket — so a movie opened
 * tomorrow holds a link that no longer works. When the render kept its result
 * id (`render.videoId`), this asks `GET /videos/{id}` again on every visit and
 * plays the answer; the stored uri stands in only when the ask fails (offline —
 * where an expired link will fail too, but a still-valid one plays) or when an
 * old render kept no id. A movie without a render, or whose result row carries
 * no file (mock mode), resolves to no uri — the cut player's case.
 */
export function useRenderSource(movie: Movie | undefined): RenderSource {
  const videoId = movie?.render?.videoId;
  const query = useQuery({
    ...editedVideoQueries.byId(videoId ?? ''),
    enabled: videoId !== undefined,
  });

  if (videoId === undefined) {
    return { uri: movie?.render?.uri, resolving: false };
  }
  if (query.data !== undefined) {
    // The fresh answer is authoritative — including "no file": a row that has
    // lost its file must not resurrect as the stale link the store remembers.
    return { uri: query.data.editedUrl, resolving: false };
  }
  return query.isError
    ? { uri: movie?.render?.uri, resolving: false }
    : { uri: undefined, resolving: true };
}
