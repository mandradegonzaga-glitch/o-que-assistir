import { describe, it, expect } from '@jest/globals';
import { blindFacts, decadeText, hasBlindOverview, lengthText, maskTitle } from '../../src/domain/blind.js';

describe('maskTitle', () => {
  it('hides the title (and the original one) wherever the synopsis says it, longest first', () => {
    expect(maskTitle('Em Duna: Parte Dois, Paul volta a Duna.', ['Duna', 'Duna: Parte Dois']))
      .toBe('Em [título], Paul volta a [título].');
    expect(maskTitle('O DIABO veste prada', ['O Diabo Veste Prada'])).toBe('[título]');
    expect(maskTitle('Um (filme) com símbolos', ['(filme)'])).toBe('Um [título] com símbolos');
    // A parte antes dos dois-pontos também entrega
    expect(maskTitle('O Avatar Aang descobre um poder antigo.', ['Avatar Aang: O Último Mestre do Ar'])).toBe('O [título] descobre um poder antigo.');
    expect(maskTitle('Ethan Hunt volta.', ['Missão Impossível - Acerto de Contas'])).toBe('Ethan Hunt volta.');
  });

  it('ignores names too short to mean anything', () => {
    expect(maskTitle('Ele vê o mar', ['O', 'Ele'])).toBe('[título] vê o mar');
    expect(maskTitle(null, ['x'])).toBe('');
  });
});

describe('facts', () => {
  it('formats the length of movies and series', () => {
    expect(lengthText({ runtime: 112 }, 'movie')).toBe('1 h 52 min');
    expect(lengthText({ runtime: 120 }, 'movie')).toBe('2 h');
    expect(lengthText({ runtime: 45 }, 'movie')).toBe('45 min');
    expect(lengthText({}, 'movie')).toBe('');
    expect(lengthText({ number_of_seasons: 1 }, 'tv')).toBe('1 temporada');
    expect(lengthText({ number_of_seasons: 3 }, 'dorama')).toBe('3 temporadas');
  });

  it('says the decade, not the year', () => {
    expect(decadeText({ release_date: '1987-05-01' })).toBe('Anos 80');
    expect(decadeText({ first_air_date: '2016-01-01' })).toBe('Anos 2010');
    expect(decadeText({ release_date: '' })).toBe('');
  });

  it('collects everything with the title hidden', () => {
    expect(blindFacts({ title: 'Matrix', original_title: 'The Matrix', overview: 'The Matrix é um mundo. Matrix!', vote_average: 8.2, runtime: 136, release_date: '1999-03-31', genres: [{ id: 28, name: 'Ação' }, { id: 878, name: 'Ficção científica' }, { id: 53 }] }, 'movie'))
      .toEqual({ rating: 8.2, length: '2 h 16 min', decade: 'Anos 90', genres: ['Ação', 'Ficção científica'], overview: '[título] é um mundo. [título]!' });
  });

  it('only accepts synopses long enough to choose from', () => {
    expect(hasBlindOverview({ overview: 'curta' })).toBe(false);
    expect(hasBlindOverview({ overview: 'x'.repeat(60) })).toBe(true);
  });
});
