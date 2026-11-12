import { describe, it, expect } from '@jest/globals';
import {
  getTitle, getYear, getTmdbEndpoint, storedRating, toLibraryItem, withRating
} from '../../src/domain/mediaItem.js';

// Nota do TMDB guardada com o título salvo (repasse da etapa 3): só quando existe e faz sentido
describe('nota guardada', () => {
  it('vem do TMDB (vote_average) ou do que já estava guardado (rating), com uma casa', () => {
    expect(storedRating({ vote_average: 8.456 })).toBe(8.5);
    expect(storedRating({ rating: 7 })).toBe(7);
    expect(storedRating({ vote_average: '6.1' })).toBe(6.1); // numeric do banco pode vir como texto
  });

  it('sem nota, zero ou fora de 0 a 10: nenhuma', () => {
    expect(storedRating({})).toBeNull();
    expect(storedRating({ vote_average: 0 })).toBeNull();
    expect(storedRating({ vote_average: 11 })).toBeNull();
    expect(storedRating({ vote_average: 'x' })).toBeNull();
    expect(storedRating(null)).toBeNull();
  });

  it('o título guardado só ganha o campo quando há nota (os antigos ficam como eram)', () => {
    expect(withRating({ id: 1 }, { vote_average: 8 })).toEqual({ id: 1, rating: 8 });
    expect(withRating({ id: 1 }, {})).toEqual({ id: 1 });
    expect(toLibraryItem({ id: 5, title: 'A', poster_path: '/a.jpg', vote_average: 7.25, media_type: 'movie' }))
      .toEqual({ id: 5, poster: '/a.jpg', title: 'A', type: 'movie', rating: 7.3 });
  });
});

describe('getTitle', () => {
  it('returns title when present', () => {
    expect(getTitle({ title: 'Inception' })).toBe('Inception');
  });
  it('falls back to name when title absent', () => {
    expect(getTitle({ name: 'Breaking Bad' })).toBe('Breaking Bad');
  });
  it('returns empty string when both absent', () => {
    expect(getTitle({})).toBe('');
  });
  it('prefers title over name', () => {
    expect(getTitle({ title: 'A', name: 'B' })).toBe('A');
  });
});

describe('getYear', () => {
  it('extracts year from release_date', () => {
    expect(getYear({ release_date: '2010-07-16' })).toBe('2010');
  });
  it('falls back to first_air_date', () => {
    expect(getYear({ first_air_date: '2008-01-20' })).toBe('2008');
  });
  it('returns empty string when both absent', () => {
    expect(getYear({})).toBe('');
  });
  it('prefers release_date over first_air_date', () => {
    expect(getYear({ release_date: '2020-01-01', first_air_date: '2010-01-01' })).toBe('2020');
  });
});

describe('getTmdbEndpoint', () => {
  it('maps dorama to tv', () => {
    expect(getTmdbEndpoint('dorama')).toBe('tv');
  });
  it('passes movie through', () => {
    expect(getTmdbEndpoint('movie')).toBe('movie');
  });
  it('passes tv through', () => {
    expect(getTmdbEndpoint('tv')).toBe('tv');
  });
});
