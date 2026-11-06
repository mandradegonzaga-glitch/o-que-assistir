import { describe, it, expect } from '@jest/globals';
import { compareTastes, compatibilityLabel, joinNames, titlesInCommon } from '../../src/domain/tasteMatch.js';

const mine = (id, genres, type = 'movie') => ({ id, type, genres });
const theirs = (id, genres, type = 'movie') => ({ tmdb_id: id, media_type: type, genres });

describe('compareTastes', () => {
  it('gives 100% for the same genre mix and 0% for nothing in common', () => {
    const a = [mine(1, [27]), mine(2, [35]), mine(3, [27])];
    const same = [theirs(4, [27]), theirs(5, [27]), theirs(6, [35])];
    expect(compareTastes(a, same).score).toBe(100);
    const other = [theirs(4, [18]), theirs(5, [10749]), theirs(6, [18])];
    const result = compareTastes(a, other);
    expect(result.score).toBe(0);
    expect(result.shared).toEqual([]);
    expect(result.label).toBe('Gostos bem diferentes');
  });

  it('sums the smaller share of each genre and is the same both ways', () => {
    // eu: Terror 2/3, Comédia 1/3; amigo: Terror 1/3, Drama 2/3 → 1/3
    const a = [mine(1, [27]), mine(2, [27]), mine(3, [35])];
    const b = [theirs(4, [27]), theirs(5, [18]), theirs(6, [18])];
    const result = compareTastes(a, b);
    expect(result.score).toBe(33);
    expect(result.shared).toEqual(['Terror']);
    expect(result.theirsMore).toBe('Drama');
    expect(result.mineMore).toBe('Comédia'); // empata com Terror (1/3 cada): vale a ordem alfabética
    const back = compareTastes(
      b.map(t => mine(t.tmdb_id, t.genres)),
      a.map(t => theirs(t.id, t.genres)),
    );
    expect(back.score).toBe(33);
  });

  it('merges TV genres like the DNA does', () => {
    const a = [mine(1, [28]), mine(2, [28]), mine(3, [28])];
    const b = [theirs(4, [10759], 'tv'), theirs(5, [10759], 'tv'), theirs(6, [28])];
    // amigo: Ação 2/3 (1 + 0,5 + 0,5 de 3), Aventura 1/3
    expect(compareTastes(a, b).score).toBe(67);
  });

  it('lists at most 3 shared genres, the biggest common slice first', () => {
    const genres = [[27], [35], [18], [28]];
    const a = genres.map((g, i) => mine(i, g));
    const b = [theirs(10, [27]), theirs(11, [27]), theirs(12, [35]), theirs(13, [18]), theirs(14, [28])];
    expect(compareTastes(a, b).shared).toEqual(['Terror', 'Ação', 'Comédia']);
  });

  it('only says who watches more of a genre when the gap is real', () => {
    const a = [mine(1, [27]), mine(2, [35]), mine(3, [18])];
    const b = [theirs(4, [27]), theirs(5, [35]), theirs(6, [18])];
    const result = compareTastes(a, b);
    expect(result.mineMore).toBeNull();
    expect(result.theirsMore).toBeNull();
  });

  it('waits for 3 titles with genres on each side', () => {
    const a = [mine(1, [27]), mine(2, [35]), mine(3, null)];
    const b = [theirs(4, [27]), theirs(5, [27]), theirs(6, [35])];
    expect(compareTastes(a, b)).toMatchObject({ ready: false, needMine: true, needTheirs: false });
    expect(compareTastes(b.map(t => mine(t.tmdb_id, t.genres)), [])).toMatchObject({ ready: false, needMine: false, needTheirs: true });
    expect(compareTastes(undefined, undefined)).toMatchObject({ ready: false, needMine: true, needTheirs: true, common: [] });
  });
});

describe('titlesInCommon', () => {
  it('matches by id and kind, counting doramas as series', () => {
    const a = [mine(1, [], 'movie'), mine(2, [], 'dorama'), mine(3, [], 'tv')];
    const b = [theirs(2, [], 'tv'), theirs(1, [], 'tv'), theirs(3, [], 'tv'), theirs(9, [], 'movie')];
    expect(titlesInCommon(a, b).map(t => t.tmdb_id)).toEqual([2, 3]);
  });
});

describe('labels and names', () => {
  it('picks a label by score', () => {
    expect(compatibilityLabel(85)).toBe('Almas gêmeas no sofá');
    expect(compatibilityLabel(60)).toBe('Gostos bem parecidos');
    expect(compatibilityLabel(45)).toBe('Alguns gostos em comum');
    expect(compatibilityLabel(10)).toBe('Gostos bem diferentes');
  });

  it('joins names in Portuguese', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['Terror'])).toBe('Terror');
    expect(joinNames(['Terror', 'Comédia'])).toBe('Terror e Comédia');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B e C');
  });
});
