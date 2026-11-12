import { describe, it, expect } from '@jest/globals';
import { MAIN_GENRE_IDS } from '../../src/domain/genres.js';
import { decadeLabel } from '../../src/domain/tasteDna.js';
import { matchRequest, tasteCard, unseenMatches } from '../../src/domain/tasteCard.js';

// Cartão-ingresso "Seu gosto" do perfil (repasse da etapa 5d)
const m = (id, genres, year, type = 'movie') => ({ id, type, genres, year });
const HISTORY = [m(1, [27], '1980'), m(2, [27, 53], '1984'), m(3, [27], '1987'), m(4, [18], '2015', 'tv'), m(5, [35], '1989')];

describe('tasteCard', () => {
  it('empty history: an invitation, no stats', () => {
    const card = tasteCard([], { name: 'Ana' });
    expect(card.empty).toBe(true);
    expect(card.stats).toEqual([]);
    expect(card.matchGenre).toBeNull();
  });

  it('names the owner, or "Seu gosto" for a guest', () => {
    expect(tasteCard(HISTORY, { name: 'Ana' }).title).toBe('O gosto de Ana');
    expect(tasteCard(HISTORY, { name: null }).title).toBe('Seu gosto');
  });

  it('three big facts: favorite genre, decade and how many titles', () => {
    expect(tasteCard(HISTORY, {}).stats).toEqual([
      { label: 'Gênero favorito', value: 'Terror' },
      { label: 'Década', value: 'Anos 80' },
      { label: 'Títulos', value: '5' },
    ]);
  });

  it('shows the main genres, with the ones you watch lit', () => {
    const { pills } = tasteCard(HISTORY, {});
    expect(pills.map(p => p.id)).toEqual(MAIN_GENRE_IDS);
    expect(pills.filter(p => p.lit).map(p => p.name).sort()).toEqual(['Comédia', 'Drama', 'Suspense', 'Terror']);
  });

  it('matches by the favorite genre', () => {
    expect(tasteCard(HISTORY, {}).matchGenre).toBe(27);
  });
});

describe('decadeLabel', () => {
  it('short before 2000, full after', () => {
    expect(decadeLabel(1980)).toBe('Anos 80');
    expect(decadeLabel(2010)).toBe('Anos 2010');
  });
});

describe('matchRequest', () => {
  it('asks for well known movies of that genre', () => {
    expect(matchRequest(27)).toEqual({ path: '/discover/movie', params: { with_genres: '27', sort_by: 'vote_count.desc', include_adult: 'false', page: 1 } });
  });
});

describe('unseenMatches', () => {
  it('skips what was watched and what has no poster, up to three', () => {
    const results = [1, 6, 7, 8, 9].map(id => ({ id, poster_path: `/${id}.jpg` }));
    results.splice(2, 0, { id: 10, poster_path: null });
    expect(unseenMatches(results, HISTORY).map(r => r.id)).toEqual([6, 7, 8]);
  });

  it('a series with the same id does not hide a movie', () => {
    expect(unseenMatches([{ id: 4, poster_path: '/4.jpg' }], HISTORY).map(r => r.id)).toEqual([4]);
  });
});
