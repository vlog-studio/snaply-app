import { DefaultMovieBgm, MovieBgmCatalog, movieBgmLabel } from './movie-bgm';

describe('movieBgmLabel', () => {
  it('names a track from the catalog', () => {
    expect(movieBgmLabel('lofi-walk')).toBe('Lo-fi Walk');
  });

  it('falls back to the id for a track this build does not know', () => {
    // The catalog moves to the server, so a stored movie may point past it.
    expect(movieBgmLabel('server-only-track')).toBe('server-only-track');
  });
});

describe('MovieBgmCatalog', () => {
  it('gives every track a distinct id', () => {
    const ids = MovieBgmCatalog.map((track) => track.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds the default a movie starts scored with', () => {
    expect(MovieBgmCatalog.some((track) => track.id === DefaultMovieBgm)).toBe(true);
  });
});
