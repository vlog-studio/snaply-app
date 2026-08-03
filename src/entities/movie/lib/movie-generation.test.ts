import {
  MovieGenerationStepCount,
  MovieGenerationTotalMs,
  movieJobProgressAt,
} from './movie-generation';

const startedAt = 1_754_000_000_000;

describe('movieJobProgressAt', () => {
  it('starts on the first step', () => {
    expect(movieJobProgressAt(startedAt, startedAt)).toMatchObject({
      stepIndex: 0,
      ratio: 0,
      isDone: false,
    });
  });

  it('reports the next boundary so the runner knows when to look again', () => {
    const { nextStepAt } = movieJobProgressAt(startedAt, startedAt);
    expect(nextStepAt).toBeGreaterThan(startedAt);
    expect(movieJobProgressAt(startedAt, nextStepAt!)).toMatchObject({ stepIndex: 1 });
  });

  it('walks every step in order as time passes', () => {
    const seen: number[] = [];
    for (let elapsed = 0; elapsed < MovieGenerationTotalMs; elapsed += 250) {
      const { stepIndex } = movieJobProgressAt(startedAt, startedAt + elapsed);
      if (seen.at(-1) !== stepIndex) seen.push(stepIndex);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
  });

  it.each([
    ['at the total', MovieGenerationTotalMs],
    // A job left running while the app was suspended comes back already over.
    ['long past the total', MovieGenerationTotalMs * 20],
  ])('is done %s', (_name, elapsed) => {
    expect(movieJobProgressAt(startedAt, startedAt + elapsed)).toEqual({
      stepIndex: MovieGenerationStepCount - 1,
      ratio: 1,
      isDone: true,
    });
  });

  it('reads a backwards clock as no progress rather than negative progress', () => {
    expect(movieJobProgressAt(startedAt, startedAt - 60_000)).toMatchObject({
      stepIndex: 0,
      ratio: 0,
      isDone: false,
    });
  });
});
