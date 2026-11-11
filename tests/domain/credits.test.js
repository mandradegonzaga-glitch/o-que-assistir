import { describe, it, expect } from '@jest/globals';
import { castMembers, crewLine, initials } from '../../src/domain/credits.js';

describe('elenco e equipe da página do título', () => {
  it('elenco com o personagem, na ordem do TMDB, até o limite', () => {
    const credits = { cast: [
      { id: 1, name: 'Ryan Gosling', character: 'Ryland Grace', profile_path: '/a.jpg' },
      { id: 2, name: 'Sandra Hüller', character: 'Eva Stratt / (voz)', profile_path: null },
      { id: 3, name: 'Sem Papel', character: '' },
    ] };
    expect(castMembers(credits, 2)).toEqual([
      { id: 1, name: 'Ryan Gosling', character: 'Ryland Grace', photo: '/a.jpg' },
      { id: 2, name: 'Sandra Hüller', character: 'Eva Stratt / (voz)', photo: null },
    ]);
    expect(castMembers(credits)[2].character).toBe('');
    expect(castMembers(undefined)).toEqual([]);
  });

  it('filme: direção e roteiro (sem repetir nomes, no máximo 2 de cada)', () => {
    const credits = { crew: [
      { name: 'Phil Lord', job: 'Director' }, { name: 'Christopher Miller', job: 'Director' },
      { name: 'Drew Goddard', job: 'Screenplay' }, { name: 'Drew Goddard', job: 'Writer' },
      { name: 'Andy Weir', job: 'Novel' }, { name: 'Alguém', job: 'Producer' },
    ] };
    expect(crewLine(credits, {})).toEqual([
      { label: 'Direção', names: ['Phil Lord', 'Christopher Miller'] },
      { label: 'Roteiro', names: ['Drew Goddard'] },
    ]);
  });

  it('série: criação, que vem nos detalhes (os créditos de série não trazem a direção)', () => {
    expect(crewLine({ crew: [] }, { created_by: [{ name: 'Vince Gilligan' }] })).toEqual([
      { label: 'Criação', names: ['Vince Gilligan'] },
    ]);
    expect(crewLine(undefined, undefined)).toEqual([]);
  });

  it('iniciais para quem não tem foto', () => {
    expect(initials('Ryan Gosling')).toBe('RG');
    expect(initials('Zendaya')).toBe('Z');
    expect(initials('Sandra Hüller Maria')).toBe('SM');
    expect(initials('  ')).toBe('');
  });
});
