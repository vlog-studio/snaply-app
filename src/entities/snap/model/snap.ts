/**
 * Orientation of a captured snap. Detection is minimal for now (portrait is the
 * default); accurate detection lands when a movie can target another ratio.
 */
export type SnapOrientation = 'portrait' | 'landscape' | 'square';

/**
 * Where a snap was captured.
 *
 * Coordinates only — no place name, no reverse geocoding. This is what makes
 * "같은 동네에서 찍은 스냅" answerable: two snaps are near each other when their
 * coordinates are, and that is the entire question the template matcher asks.
 */
export type SnapPlace = {
  latitude: number;
  longitude: number;
};

/**
 * A captured 3–5 second original — the raw material a movie is cut from. The
 * underlying video file lives on disk (see `shared/lib/recording-files`,
 * addressed by `uri`); this is the metadata a snap carries on top of that file.
 *
 * Snaps are referenced by movies (N:M) and are never mutated by movie edits —
 * per-movie order and trim live on the movie's snap references (see
 * `entities/movie`), so the same snap can appear differently in two movies.
 */
export type Snap = {
  id: string;
  /** File URI of the source video, as returned by `recording-files`. */
  uri: string;
  durationSec: number;
  /** Epoch milliseconds when the snap was captured. */
  capturedAt: number;
  width: number;
  height: number;
  orientation: SnapOrientation;
  /**
   * Where the snap was captured, when a fix was available at the time.
   *
   * Optional on purpose and permanently so: location permission may be refused,
   * a fix may not arrive in time, and every snap captured before this field
   * existed has none. Anything reading it must degrade to time alone rather
   * than treat a missing place as an error.
   */
  place?: SnapPlace;
};
