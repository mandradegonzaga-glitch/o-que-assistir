import { describe, it, expect } from '@jest/globals';
import { formatRuntime, seasonsLabel, titleFacts } from '../../src/domain/titleFacts.js';

describe('linha única de informações do título', () => {
  it('formata a duração do jeito brasileiro', () => {
    expect(formatRuntime(136)).toBe('2h 16min');
    expect(formatRuntime(120)).toBe('2h');
    expect(formatRuntime(45)).toBe('45min');
    expect(formatRuntime(0)).toBe('');
    expect(formatRuntime(undefined)).toBe('');
  });

  it('conta temporadas no singular e no plural', () => {
    expect(seasonsLabel(1)).toBe('1 temporada');
    expect(seasonsLabel(5)).toBe('5 temporadas');
    expect(seasonsLabel(0)).toBe('');
  });

  it('filme: nota, ano, duração e até 2 gêneros em português', () => {
    expect(titleFacts({ rating: 8.7, date: '1999-03-30', runtime: 136, genres: [28, 878, 53] })).toEqual([
      { kind: 'rating', text: '8,7' },
      { kind: 'year', text: '1999' },
      { kind: 'length', text: '2h 16min' },
      { kind: 'genres', text: 'Ação, Ficção científica' },
    ]);
  });

  it('série: temporadas no lugar da duração; gêneros dos detalhes pelo id (o TMDB manda alguns em inglês)', () => {
    const facts = titleFacts({ rating: 8.6, date: '2016-07-15', seasons: 5, runtime: 50, genres: [{ id: 10759, name: 'Action & Adventure' }, { id: 9648 }] });
    expect(facts.map(f => f.text)).toEqual(['8,6', '2016', '5 temporadas', 'Ação e aventura, Mistério']);
  });

  it('o que não existe fica de fora, sem separador sobrando', () => {
    expect(titleFacts({ date: '' })).toEqual([]);
    expect(titleFacts({ rating: 7, genres: [99999] })).toEqual([{ kind: 'rating', text: '7,0' }]);
  });
});
