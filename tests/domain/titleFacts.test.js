import { describe, it, expect } from '@jest/globals';
import { formatRuntime, seasonsLabel, titleFacts, titleSize } from '../../src/domain/titleFacts.js';

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
      { kind: 'genres', items: ['Ação', 'Ficção científica'] },
    ]);
  });

  it('classificação indicativa do Brasil vai junto dos gêneros: "L" vira "Livre"', () => {
    expect(titleFacts({ certification: '14', genres: [18] })).toEqual([
      { kind: 'certification', text: '14', label: 'Classificação: 14 anos' },
      { kind: 'genres', items: ['Drama'] },
    ]);
    expect(titleFacts({ certification: 'L' })).toEqual([{ kind: 'certification', text: 'Livre', label: 'Classificação: livre' }]);
    expect(titleFacts({ certification: '' })).toEqual([]);
  });

  it('série: temporadas no lugar da duração; gêneros dos detalhes pelo id (o TMDB manda alguns em inglês)', () => {
    const facts = titleFacts({ rating: 8.6, date: '2016-07-15', seasons: 5, runtime: 50, genres: [{ id: 10759, name: 'Action & Adventure' }, { id: 9648 }] });
    expect(facts.map(f => f.text || f.items)).toEqual(['8,6', '2016', '5 temporadas', ['Ação e aventura', 'Mistério']]);
  });

  it('o que não existe fica de fora, sem separador sobrando', () => {
    expect(titleFacts({ date: '' })).toEqual([]);
    expect(titleFacts({ rating: 7, genres: [99999] })).toEqual([{ kind: 'rating', text: '7,0' }]);
  });
});

describe('titleSize', () => {
  it('título curto fica no tamanho normal', () => {
    expect(titleSize('Duna')).toBe('');
    expect(titleSize('Toy Story 4')).toBe('');
  });
  it('título médio ou com palavra de 10 a 11 letras fica um pouco menor', () => {
    expect(titleSize('Todo Mundo em Pânico: A Volta Final')).toBe('mid');
    expect(titleSize('Hipnotizada')).toBe('mid');
  });
  it('título longo ou com palavra que não cabe fica menor', () => {
    expect(titleSize('O Senhor dos Anéis: O Retorno do Rei – Versão Estendida Remasterizada do Diretor')).toBe('long');
    expect(titleSize('Krankenhausverwaltung')).toBe('long');
  });
  it('vazio ou sem texto não quebra', () => {
    expect(titleSize()).toBe('');
    expect(titleSize('   ')).toBe('');
  });
});
