/** One track of the BGM catalog. */
export type MovieBgmOption = {
  /** Stored on the movie as `Movie.bgm`. */
  id: string;
  label: string;
};

/**
 * The background tracks a movie can be scored with (concept §6 step ②).
 *
 * A local constant until the backend serves `GET /bgms`, which is why `Movie.bgm`
 * is a plain string rather than a union: the catalog is going to come from the
 * server, and a movie must keep pointing at a track this build has never heard
 * of. `무음` is a real choice, not the absence of one — a plain style with no
 * music is a look.
 */
export const MovieBgmCatalog: readonly MovieBgmOption[] = [
  { id: 'lofi-walk', label: 'Lo-fi Walk' },
  { id: 'sunny-side', label: 'Sunny Side' },
  { id: 'night-drift', label: 'Night Drift' },
  { id: 'morning-tape', label: 'Morning Tape' },
  { id: 'silence', label: '무음' },
];

/** What a movie starts scored with, before the user reaches the style step. */
export const DefaultMovieBgm = 'lofi-walk';

/** A track's name, falling back to its id for a track this build does not know. */
export function movieBgmLabel(id: string): string {
  return MovieBgmCatalog.find((track) => track.id === id)?.label ?? id;
}
