import { describe, it, expect } from '@jest/globals';
import { shareRow, shareText, titleKind, titleLink, truncate } from '../../src/domain/titleShare.js';
import { readFileSync } from 'node:fs';
import { MEDIA_KIND } from '../../src/domain/mediaItem.js';

describe('titleKind', () => {
  it('filme é filme em qualquer modo', () => {
    expect(titleKind({ media_type: 'movie' }, 'dorama')).toBe('movie');
  });

  it('série coreana é dorama, mesmo aberta no modo série', () => {
    expect(titleKind({ media_type: 'tv', origin_country: ['KR'] }, 'tv')).toBe('dorama');
  });

  it('série de outro país é série, mesmo aberta no modo dorama', () => {
    expect(titleKind({ media_type: 'tv', origin_country: ['US'] }, 'dorama')).toBe('tv');
  });

  it('sem país, vale o modo', () => {
    expect(titleKind({ media_type: 'tv' }, 'dorama')).toBe('dorama');
    expect(titleKind({ media_type: 'tv' }, 'movie')).toBe('tv');
    expect(titleKind({}, 'tv')).toBe('tv');
    expect(titleKind({}, 'movie')).toBe('movie');
  });

  it('a cor de cada tipo é a do tema dele no CSS', () => {
    const css = readFileSync(new URL('../../src/styles/style.css', import.meta.url), 'utf8');
    for (const [type, { color }] of Object.entries(MEDIA_KIND)) {
      const theme = new RegExp(`\\[data-theme="${type}"\\]\\s*\\{[^}]*--accent-primary:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
      expect({ type, color: theme?.[1] }).toEqual({ type, color });
    }
  });
});

describe('truncate', () => {
  it('não mexe no que cabe', () => {
    expect(truncate('  Curto   e  bom ', 50)).toBe('Curto e bom');
  });

  it('corta no fim da palavra e tira a pontuação solta', () => {
    expect(truncate('Um homem descobre, de repente, que tudo mudou', 20)).toBe('Um homem descobre…');
  });

  it('palavra única longa é cortada no limite', () => {
    expect(truncate('a'.repeat(30), 10)).toBe(`${'a'.repeat(10)}…`);
  });

  it('vazio continua vazio', () => {
    expect(truncate(undefined, 10)).toBe('');
  });
});

describe('shareText', () => {
  const item = { title: 'Matrix', overview: 'Um hacker descobre a verdade.', vote_average: 8.2, release_date: '1999-03-31' };
  const url = titleLink('https://site.dev/', 'movie', 603);

  it('leva título, tipo, ano, nota, sinopse, elenco, onde assistir e link', () => {
    const text = shareText({ item, kind: 'movie', url, cast: ['Keanu Reeves', 'Carrie-Anne Moss', 'Laurence Fishburne', 'Hugo Weaving', 'Joe'], providers: ['Netflix', 'Max'] });
    expect(text).toBe([
      'Hoje é dia de: Matrix',
      'Filme · 1999 · Nota 8,2',
      '',
      'Um hacker descobre a verdade.',
      '',
      'Elenco: Keanu Reeves, Carrie-Anne Moss, Laurence Fishburne, Hugo Weaving',
      'Onde assistir: Netflix, Max',
      '',
      'Veja no O Que Assistir?',
      'https://site.dev/?titulo=movie-603',
    ].join('\n'));
  });

  it('omite o que não tem', () => {
    const text = shareText({ item: { name: 'Sem Nada' }, kind: 'dorama', url });
    expect(text).toBe(`Hoje é dia de: Sem Nada\nDorama\n\nVeja no O Que Assistir?\n${url}`);
  });
});

describe('shareRow', () => {
  it('guarda só o necessário', () => {
    expect(shareRow({ id: 1, name: 'Série', poster_path: '/abc_D-1.jpg', overview: 'x' }, 'tv'))
      .toEqual({ media_type: 'tv', tmdb_id: 1, title: 'Série', poster_path: '/abc_D-1.jpg' });
  });

  it('descarta pôster com caminho estranho', () => {
    expect(shareRow({ id: 1, title: 'X', poster_path: '/../x.jpg' }, 'movie').poster_path).toBeNull();
    expect(shareRow({ id: 1, title: 'X', poster_path: 'https://mal.dev/x.jpg' }, 'movie').poster_path).toBeNull();
  });

  it('recusa tipo, id ou título inválidos', () => {
    expect(shareRow({ id: 1, title: 'X' }, 'anime')).toBeNull();
    expect(shareRow({ id: -1, title: 'X' }, 'movie')).toBeNull();
    expect(shareRow({ id: 1, title: '  ' }, 'movie')).toBeNull();
  });

  it('corta título enorme', () => {
    expect(shareRow({ id: 1, title: 'a'.repeat(400) }, 'movie').title).toHaveLength(300);
  });
});
