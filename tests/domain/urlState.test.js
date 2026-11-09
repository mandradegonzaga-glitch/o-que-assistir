import { describe, it, expect } from '@jest/globals';
import { parseUrlState, serializeUrlState } from '../../src/domain/urlState.js';

describe('parseUrlState', () => {
  it('reads filters and the open title', () => {
    expect(parseUrlState('?modo=roulette&tipo=tv&genero=35,10749&de=1990&ate=2000&titulo=tv-42')).toEqual({
      mode: 'roulette', type: 'tv', genre: '35,10749', yearFrom: '1990', yearTo: '2000', title: { type: 'tv', id: 42 },
    });
  });

  it('ignores invalid values', () => {
    expect(parseUrlState('?modo=x&tipo=<b>&genero=abc&de=19&duracao=y&titulo=movie-abc&pessoa=z&pessoaNome=q')).toEqual({});
  });

  it('accepts known moods and the personal providers filter', () => {
    expect(parseUrlState('?clima=leve&onde=minhas')).toEqual({ mood: 'leve', provider: 'minhas' });
    expect(parseUrlState('?clima=xyz&onde=abc')).toEqual({});
  });

  it('keeps free text as text', () => {
    expect(parseUrlState('?parecido=Ocean%27s%20%26%2011').similar).toBe("Ocean's & 11");
  });
});

describe('serializeUrlState', () => {
  it('omits defaults and empty values', () => {
    expect(serializeUrlState({ mode: 'discover', type: 'movie', genre: '' })).toBe('');
  });

  it('preserves unrelated params and removes cleared ones', () => {
    expect(serializeUrlState({ type: 'tv' }, '?fake=1&genero=35')).toBe('?fake=1&tipo=tv');
  });

  it('round-trips', () => {
    const state = { mode: 'roulette', type: 'dorama', similar: 'A & B', personId: '10', personName: 'Ana', title: { type: 'movie', id: 7 } };
    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
  });
});

describe('país na URL', () => {
  it('keeps known countries and drops anything else', () => {
    expect(parseUrlState('?pais=JP').country).toBe('JP');
    expect(parseUrlState('?pais=XX').country).toBeUndefined();
    expect(parseUrlState('?pais=jp').country).toBeUndefined();
    expect(serializeUrlState({ country: 'FR' })).toContain('pais=FR');
  });
});

it('o link aceita o gênero "natal" (palavra-chave)', () => {
  expect(parseUrlState('?genero=natal').genre).toBe('natal');
  expect(parseUrlState('?genero=natal1').genre).toBeUndefined();
});
