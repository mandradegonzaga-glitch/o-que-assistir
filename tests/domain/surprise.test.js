import { describe, it, expect } from '@jest/globals';
import { SURPRISE_GENRES, genreScores, surpriseGenres } from '../../src/domain/surprise.js';

const movie = genres => ({ type: 'movie', genres });
const fixed = () => 0; // sem sorte: a ordem fica previsível

describe('surpriseGenres', () => {
  it('puts the never-watched genres first and the most watched last', () => {
    const seen = SURPRISE_GENRES.movie.filter(id => id !== 37 && id !== 99);
    const history = [...seen.map(g => movie([g])), movie([18]), movie([18])];
    const order = surpriseGenres(history, 'movie', fixed);
    expect(order.slice(0, 2).sort()).toEqual([37, 99]);
    expect(order.at(-1)).toBe(18);
    expect(order).toHaveLength(SURPRISE_GENRES.movie.length);
  });

  it('for series, movie genres count in the merged ones', () => {
    const scores = Object.fromEntries(genreScores([movie([28]), movie([12])], 'tv').map(s => [s.id, s.weight]));
    expect(scores[10759]).toBe(2); // Ação + Aventura
    expect(scores[35]).toBe(0);
  });

  it('with no history, any genre of the type can come up', () => {
    expect(new Set(surpriseGenres([], 'dorama'))).toEqual(new Set(SURPRISE_GENRES.dorama));
  });

  it('never suggests genres that do not make good surprises', () => {
    expect(SURPRISE_GENRES.movie).not.toContain(10770);
    expect(SURPRISE_GENRES.tv).not.toEqual(expect.arrayContaining([10763, 10764, 10766, 10767]));
  });
});
