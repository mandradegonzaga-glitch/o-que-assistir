import { describe, it, expect } from '@jest/globals';
import { PERSONAL_MIN_TITLES, choosePick, personalRequest, pickProfile, profileKey, usableGenres } from '../../src/domain/dailyPicks.js';

const movie = (id, genres) => ({ id, type: 'movie', genres });
const show = (id, genres, type = 'tv') => ({ id, type, genres });
// Terror 2, Ação 2, Drama 2, Comédia 1 (empate: menor id primeiro)
const HISTORY = [movie(1, [27]), movie(2, [27]), movie(3, [28]), movie(4, [28]), show(5, [18]), show(6, [18]), show(7, [35], 'dorama')];
// Lista de gêneros com peso, como pickProfile devolve
const g = (...pairs) => pairs.map(([id, weight]) => ({ id, weight }));

describe('pickProfile', () => {
  it('needs the same number of titles as a stable DNA', () => {
    expect(PERSONAL_MIN_TITLES).toBe(5);
    expect(pickProfile(HISTORY.slice(0, 4))).toBeNull();
    expect(pickProfile([...HISTORY.slice(0, 4), movie(9, null)])).toBeNull(); // sem gênero não conta
    expect(pickProfile(undefined)).toBeNull();
  });

  it('ranks the genres and separates watched movies from series', () => {
    const profile = pickProfile(HISTORY);
    expect(profile.genres).toEqual(g([18, 2], [27, 2], [28, 2], [35, 1]));
    expect([...profile.watched.movie]).toEqual([1, 2, 3, 4]);
    expect([...profile.watched.tv]).toEqual([5, 6, 7]); // dorama também é série no TMDB
  });
});

describe('usableGenres', () => {
  it('keeps movie genres as they are for the movie card, at most 3', () => {
    expect(usableGenres(g([27, 3], [28, 3], [18, 2], [35, 2]), 0)).toEqual([27, 28, 18]);
  });

  it('only rotates genres with at least half the weight of the favorite', () => {
    // Quase só terror: o suspense (1/4 do terror) não entra no rodízio
    expect(usableGenres(g([27, 4], [53, 1]), 0)).toEqual([27]);
    expect(usableGenres(g([27, 4], [53, 2]), 0)).toEqual([27, 53]);
  });

  it('translates movie genres for series, adding up the ones that merge, and skips the missing ones', () => {
    // Terror e Romance não existem em série; Ação + Aventura somam em "Ação e aventura"
    expect(usableGenres(g([27, 5], [18, 3], [28, 2], [12, 2], [10749, 2], [878, 2]), 1)).toEqual([10759, 18, 10765]);
  });

  it('skips genres the card already excludes (animation)', () => {
    expect(usableGenres(g([16, 2], [35, 2]), 1)).toEqual([35]);
    expect(usableGenres(g([16, 2], [35, 2]), 2)).toEqual([35]);
    expect(usableGenres(g([16, 2], [35, 2]), 0)).toEqual([16, 35]);
  });

  it('returns nothing when no genre fits', () => {
    expect(usableGenres(g([27, 3], [10749, 1], [53, 1]), 1)).toEqual([]);
    expect(usableGenres(undefined, 0)).toEqual([]);
  });
});

describe('personalRequest', () => {
  const profile = pickProfile(HISTORY);

  it('asks for one favorite genre with the same quality filters', () => {
    const request = personalRequest(0, '2026-11-06', profile);
    expect(request.path).toBe('/discover/movie');
    expect(request.params).toMatchObject({ sort_by: 'vote_count.desc', 'vote_average.gte': 7.3, 'vote_count.gte': 3000 });
    expect([18, 27, 28]).toContain(Number(request.params.with_genres));
    expect(request.params.page).toBeGreaterThanOrEqual(1);
    expect(request.params.page).toBeLessThanOrEqual(3);
    expect(request.exclude).toBe(profile.watched.movie);
  });

  it('rotates the favorite genres day by day', () => {
    const days = ['2026-11-06', '2026-11-07', '2026-11-08'].map(d => personalRequest(0, d, profile).params.with_genres);
    expect(new Set(days).size).toBe(3);
  });

  it('keeps the dorama filters and uses the series watched list', () => {
    const request = personalRequest(2, '2026-11-06', profile);
    expect(request.params.with_origin_country).toBe('KR');
    expect(request.exclude).toBe(profile.watched.tv);
  });

  it('gives up when none of the genres exists for series (the card falls back)', () => {
    const horror = pickProfile([1, 2, 3, 4, 5].map(id => movie(id, [27])));
    expect(personalRequest(0, '2026-11-06', horror)).not.toBeNull();
    expect(personalRequest(1, '2026-11-06', horror)).toBeNull();
    expect(personalRequest(2, '2026-11-06', horror)).toBeNull();
    expect(personalRequest(0, '2026-11-06', null)).toBeNull();
  });
});

describe('choosePick with watched titles', () => {
  it('skips what the person already watched', () => {
    const results = [{ id: 1, poster_path: '/a' }, { id: 2, poster_path: '/b' }];
    expect(choosePick(results, 0, 'movie', new Set([1])).id).toBe(2);
    expect(choosePick(results, 0, 'movie', new Set([1, 2]))).toBeNull();
    expect(choosePick(results, 0, 'movie').id).toBe(1);
  });
});

describe('profileKey', () => {
  it('only changes when the genres that matter change', () => {
    const profile = pickProfile(HISTORY);
    expect(profileKey(null)).toBe('all');
    // Documentário e Faroeste (meio título cada) pesam pouco: o rodízio não muda
    expect(profileKey(pickProfile([...HISTORY, movie(50, [99, 37])]))).toBe(profileKey(profile));
    expect(profileKey(pickProfile([...HISTORY, ...[51, 52, 53, 54].map(id => movie(id, [35]))]))).not.toBe(profileKey(profile));
  });
});
