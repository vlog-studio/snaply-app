import type { MovieStyle } from '../model/movie';
import { MovieStyleCatalog, movieStyleLabel } from './movie-style';

const everyStyle: MovieStyle[] = ['calm', 'upbeat', 'plain', 'emotional'];

describe('MovieStyleCatalog', () => {
  it('describes every style exactly once', () => {
    expect(MovieStyleCatalog.map((option) => option.id).sort()).toEqual([...everyStyle].sort());
  });

  it.each(everyStyle)('gives %s a label, a description, and a swatch', (style) => {
    const option = MovieStyleCatalog.find((entry) => entry.id === style);
    expect(option?.label).toBeTruthy();
    expect(option?.description).toBeTruthy();
    expect(option?.swatch).toHaveLength(2);
  });

  it('names a style for the picker', () => {
    expect(movieStyleLabel('calm')).toBe(MovieStyleCatalog[0].label);
  });
});
