import type { MovieStyle } from '../model/movie';

/** One entry of the style catalog, as the style step draws it. */
export type MovieStyleOption = {
  id: MovieStyle;
  label: string;
  /** One line on what the style does to the footage. */
  description: string;
  /** Two tones for the card's swatch, top then bottom. */
  swatch: readonly [string, string];
};

/**
 * What each style is. Keyed by `MovieStyle` rather than listed, so adding a
 * style to the union fails to compile until it is described here.
 *
 * The swatch tones are the styles' own identity colors, deliberately outside the
 * app palette: they stand for four different looks, which is the one thing a
 * single-accent palette cannot express.
 */
const StyleOptions: Record<MovieStyle, Omit<MovieStyleOption, 'id'>> = {
  calm: { label: '잔잔한', description: '긴 컷 · 부드러운 전환', swatch: ['#3E5C6B', '#1B2A32'] },
  upbeat: {
    label: '경쾌한',
    description: '짧은 컷 · 비트에 맞춘 전환',
    swatch: ['#C4562A', '#6B2A12'],
  },
  plain: { label: '담백한', description: '컷 편집 없음 · 무음악', swatch: ['#5C6470', '#252A31'] },
  emotional: {
    label: '감성적인',
    description: '느린 전환 · 따뜻한 색',
    swatch: ['#7A5A8C', '#301F3C'],
  },
};

/** Presentation order, calm first as the default. */
const StyleOrder: readonly MovieStyle[] = ['calm', 'upbeat', 'plain', 'emotional'];

/**
 * The four styles a movie can be generated with (concept §6 step ②).
 *
 * A local constant until the backend serves `GET /styles`. Four is deliberate —
 * enough to feel like a choice, few enough to pick without deliberating.
 */
export const MovieStyleCatalog: readonly MovieStyleOption[] = StyleOrder.map((id) => ({
  id,
  ...StyleOptions[id],
}));

/** What a movie starts as, before the user reaches the style step. */
export const DefaultMovieStyle: MovieStyle = 'calm';

export function movieStyleLabel(style: MovieStyle): string {
  return StyleOptions[style].label;
}
