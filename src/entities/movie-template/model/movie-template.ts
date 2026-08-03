import type { MovieStyle } from '@/entities/movie/@x/movie-template';

/**
 * One scene a template asks for.
 *
 * `label` and `hint` are written for a person to read and go shoot — "골목",
 * "좁은 길, 걷는 발". **Nothing matches them.** The app cannot tell an alley from
 * a shopfront: matching sees time and place only (see `features/fill-template`),
 * so a slot's words are shooting direction, never a claim about what the snap in
 * it contains. Keeping them human is the point — an unfilled slot is what turns
 * a library into a reason to go out and shoot.
 */
export type TemplateSlot = {
  id: string;
  label: string;
  /** One line of direction, shown under the label and on the empty slot. */
  hint: string;
};

/**
 * A shape a movie can be made in: a fixed number of scenes, in a fixed order,
 * with the look it should start out with.
 *
 * The catalog is a small local constant on purpose. The recipe direction was set
 * aside once (concept §3) because a catalog somebody has to keep running is a
 * standing cost, and this is the version that has none: a handful of templates
 * that ship with the build and change when the build does. If it ever earns a
 * server (`GET /templates`), only the catalog module moves.
 */
export type MovieTemplate = {
  id: string;
  name: string;
  /** One line under the name, on the card. */
  description: string;
  /** What a movie made from this template starts out looking and sounding like. */
  style: MovieStyle;
  bgm: string;
  slots: TemplateSlot[];
};
