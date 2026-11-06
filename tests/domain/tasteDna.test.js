import { describe, it, expect } from '@jest/globals';
import {
  DNA_STABLE_TITLES, computeTasteDna, dnaSentence, favoriteDecade, genreDna, genreIdsOf, monthlyActivity, otherNamesText, roundToHundred, typeSplit
} from '../../src/domain/tasteDna.js';

describe('otherNamesText', () => {
  it('joins names in Portuguese and shortens long lists with "e mais N"', () => {
    expect(otherNamesText(['Ação'])).toBe('Ação');
    expect(otherNamesText(['Ação', 'Drama'])).toBe('Ação e Drama');
    expect(otherNamesText(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C, D e E');
    expect(otherNamesText(['A', 'B', 'C', 'D', 'E', 'F'])).toBe('A, B, C, D, E e F');
    expect(otherNamesText(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toBe('A, B, C, D, E e mais 2');
    expect(otherNamesText(undefined)).toBe('');
  });
});

const t = (genres, extra = {}) => ({ id: Math.random(), genres, type: 'movie', ...extra });

describe('genreIdsOf', () => {
  it('accepts ids, objects and numeric strings', () => {
    expect(genreIdsOf({ genres: [27, { id: 35, name: 'Comédia' }, '18'] })).toEqual([27, 35, 18]);
  });

  it('splits combined TV genres into the movie ones and removes duplicates', () => {
    expect(genreIdsOf({ genres: [10759, 28] })).toEqual([28, 12]);
    expect(genreIdsOf({ genres: [10765] })).toEqual([878, 14]);
  });

  it('ignores missing, null and unknown genres', () => {
    expect(genreIdsOf({})).toEqual([]);
    expect(genreIdsOf({ genres: null })).toEqual([]);
    expect(genreIdsOf({ genres: [null, 999999, 'x'] })).toEqual([]);
  });
});

describe('roundToHundred', () => {
  it('always sums to 100', () => {
    [[1, 1, 1], [2, 1], [0.5, 0.25, 0.25], [7, 3, 3, 1, 1, 1]].forEach(w => {
      expect(roundToHundred(w).reduce((a, b) => a + b, 0)).toBe(100);
    });
    expect(roundToHundred([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('returns zeros when there is nothing to split', () => {
    expect(roundToHundred([])).toEqual([]);
    expect(roundToHundred([0, 0])).toEqual([0, 0]);
  });
});

describe('genreDna', () => {
  it('gives each title a weight of 1 split among its genres', () => {
    const { titles, genres } = genreDna([t([27]), t([27]), t([35, 28])]);
    expect(titles).toBe(3);
    expect(genres).toEqual([
      { id: 27, name: 'Terror', percent: 67 },
      { id: 28, name: 'Ação', percent: 17 },
      { id: 35, name: 'Comédia', percent: 16 },
    ]);
  });

  it('keeps the top genres and folds the rest into "Outros"', () => {
    const history = [27, 35, 28, 18, 53, 10749, 99].map(id => t([id]));
    history.push(t([27]));
    const { genres } = genreDna(history, 3);
    expect(genres.map(g => g.name)).toEqual(['Terror', 'Ação', 'Comédia', 'Outros']);
    expect(genres.reduce((s, g) => s + g.percent, 0)).toBe(100);
    // Outros diz quais gêneros entraram nele, na mesma ordem do ranking
    expect(genres[3].members).toEqual(['Documentário', 'Drama', 'Romance', 'Suspense']);
    expect(genres[0].members).toBeUndefined();
  });

  it('skips titles without genres and handles an empty history', () => {
    expect(genreDna([t(null), t([])])).toEqual({ titles: 0, genres: [] });
    expect(genreDna(undefined)).toEqual({ titles: 0, genres: [] });
  });
});

describe('typeSplit', () => {
  it('counts movies, series and doramas (missing type counts as movie)', () => {
    expect(typeSplit([{ type: 'movie' }, { type: 'tv' }, { type: 'dorama' }, { type: 'dorama' }, {}]))
      .toEqual({ movie: 2, tv: 1, dorama: 2 });
  });
});

describe('favoriteDecade', () => {
  it('picks the decade with most titles, the most recent on a tie', () => {
    expect(favoriteDecade([{ year: '1985' }, { year: '1989' }, { year: '2010' }])).toEqual({ decade: 1980, count: 2 });
    expect(favoriteDecade([{ year: '1995' }, { year: '2003' }])).toEqual({ decade: 2000, count: 1 });
  });

  it('ignores missing and invalid years', () => {
    expect(favoriteDecade([{ year: '' }, { year: null }, {}, { year: 'abc' }])).toBeNull();
  });
});

describe('monthlyActivity', () => {
  const now = new Date(2026, 10, 5, 12); // 5 de novembro de 2026, hora local

  it('returns the last 6 months, the current one last', () => {
    const months = monthlyActivity([], now);
    expect(months.map(m => m.label)).toEqual(['jun', 'jul', 'ago', 'set', 'out', 'nov']);
    expect(months[5].key).toBe('2026-11');
  });

  it('crosses the year boundary', () => {
    expect(monthlyActivity([], new Date(2027, 1, 10)).map(m => m.key))
      .toEqual(['2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02']);
  });

  it('counts by local month and ignores old or invalid dates', () => {
    const history = [
      { watchedAt: new Date(2026, 10, 1, 0, 30).toISOString() },
      { watchedAt: new Date(2026, 9, 31, 23, 30).toISOString() },
      { watchedAt: new Date(2025, 10, 1).toISOString() },
      { watchedAt: 'not a date' },
      {},
    ];
    const months = monthlyActivity(history, now);
    expect(months[5].count).toBe(1);
    expect(months[4].count).toBe(1);
    expect(months.reduce((s, m) => s + m.count, 0)).toBe(2);
  });
});

describe('dnaSentence', () => {
  it('lists the genres in Portuguese, without "Outros"', () => {
    expect(dnaSentence([
      { id: 27, name: 'Terror', percent: 40 },
      { id: 35, name: 'Comédia', percent: 30 },
      { id: 28, name: 'Ação', percent: 20 },
      { id: 'other', name: 'Outros', percent: 10 },
    ])).toBe('40% Terror, 30% Comédia e 20% Ação');
    expect(dnaSentence([{ id: 27, name: 'Terror', percent: 100 }])).toBe('100% Terror');
    expect(dnaSentence([])).toBe('');
  });
});

describe('computeTasteDna', () => {
  it('combines everything and flags a DNA that is still forming', () => {
    const history = [t([27], { year: '1984', type: 'tv' }), t([27], { year: '1999' })];
    const dna = computeTasteDna(history, new Date(2026, 10, 5));
    expect(dna.total).toBe(2);
    expect(dna.sentence).toBe('100% Terror');
    expect(dna.types).toEqual({ movie: 1, tv: 1, dorama: 0 });
    expect(dna.decade).toEqual({ decade: 1990, count: 1 });
    expect(dna.forming).toBe(true);
    expect(dna.months).toHaveLength(6);
  });

  it('stops "forming" once there are enough titles with genres', () => {
    const history = Array.from({ length: DNA_STABLE_TITLES }, () => t([35]));
    expect(computeTasteDna(history).forming).toBe(false);
  });

  it('works with an empty or missing history', () => {
    const dna = computeTasteDna(null);
    expect(dna.total).toBe(0);
    expect(dna.genres).toEqual([]);
    expect(dna.decade).toBeNull();
  });
});
