/**
 * How many snaps one movie may hold. The single hard constraint of the product
 * (concept §5): a movie is a short-form vlog, not an album. `entities/tray` caps
 * the tray at the same number, so a full tray is exactly one movie's worth.
 */
export const MovieSnapLimit = 10;

/**
 * The look a movie is generated with. Four is deliberate — enough to feel like a
 * choice, few enough to pick without deliberating (concept §6 step ②). The
 * catalog is local until the backend serves `GET /styles`.
 */
export type MovieStyle = 'calm' | 'upbeat' | 'plain' | 'emotional';

/**
 * A movie's lifecycle.
 *
 * `draft` is anything the user has assembled but not generated — it survives
 * leaving the editor. `failed` is a first-class state rather than a flavor of
 * draft, because a generation job is remote work that really does fail and the
 * user has to be able to tell "I have not run this yet" from "it broke".
 */
export type MovieStatus = 'draft' | 'generating' | 'ready' | 'failed';

/**
 * A movie's reference to a snap. The snap original is immutable; per-movie edit
 * information (position in the cut list, optional trim) lives here so the same
 * snap can be cut differently into two movies.
 */
export type SnapRef = {
  snapId: string;
  order: number;
  trim?: { startSec: number; endSec: number };
};

/**
 * What a finished generation produced. `uri` is the rendered file once a real
 * compositing backend exists; until then a ready movie is played by running its
 * cuts in order, so the field is optional.
 */
export type MovieRender = {
  uri?: string;
  renderedAt: number;
  durationSec: number;
};

/**
 * A movie — an ordered set of snap references plus the generation settings that
 * turn them into one short-form vlog.
 *
 * This replaces the old roll/reel pair: a roll was membership and a reel was the
 * developed result, but a movie owns both, because the user edits and generates
 * the same object rather than promoting one into the other.
 */
export type Movie = {
  id: string;
  title: string;
  status: MovieStatus;
  /** Epoch milliseconds. */
  createdAt: number;
  /** Epoch milliseconds of the last edit — what the studio board sorts by. */
  updatedAt: number;
  snapRefs: SnapRef[];
  style: MovieStyle;
  /** Track identifier from the BGM catalog. */
  bgm: string;
  /** Only 9:16 for now; stored so a movie keeps its ratio when others arrive. */
  ratio: '9:16';
  /** Set while a generation job is in flight, and kept for a retry afterwards. */
  jobId?: string;
  render?: MovieRender;
  /** Why the last generation failed, for the recovery UI. */
  error?: string;
};
