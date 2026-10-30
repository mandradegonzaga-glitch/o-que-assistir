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
