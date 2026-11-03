import { describe, it, expect } from '@jest/globals';
import { GENRE_NAMES, genreNames } from '../../src/domain/genres.js';

describe('genreNames', () => {
  it('turns TMDB ids into Portuguese names, movies and series', () => {
    expect(genreNames([18, 10749])).toEqual(['Drama', 'Romance']);
    expect(genreNames([10765, 10759])).toEqual(['Ficção e fantasia', 'Ação e aventura']);
  });

  it('accepts the objects from the title details', () => {
    expect(genreNames([{ id: 27, name: 'Terror' }, { id: 53 }])).toEqual(['Terror', 'Suspense']);
  });

  it('keeps at most 3, skips unknown ids and repeated names', () => {
    expect(genreNames([28, 12, 35, 80])).toHaveLength(3);
    expect(genreNames([999999, 18, 18])).toEqual(['Drama']);
  });

  it('survives missing data', () => {
    expect(genreNames(undefined)).toEqual([]);
    expect(genreNames([null])).toEqual([]);
  });

  it('knows every genre the app filters by', () => {
    [28, 35, 10749, 27, 878, 16, 99, 80, 9648, 18, 10759, 10765, 10764, 10767].forEach(id => expect(GENRE_NAMES[id]).toBeTruthy());
  });
});
