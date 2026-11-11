import { describe, it, expect } from '@jest/globals';
import { formatDay, formatRating, formatCount, joinMeta, pluralize } from '../../src/utils/format.js';

const NBSP = String.fromCharCode(0xa0);

describe('format', () => {
  it('formats ratings with a comma and one decimal', () => {
    expect(formatRating(8.456)).toBe('8,5');
    expect(formatRating(7)).toBe('7,0');
  });

  it('shows N/A when there is no rating', () => {
    expect(formatRating(0)).toBe('N/A');
    expect(formatRating(undefined)).toBe('N/A');
  });

  it('groups thousands with a dot', () => {
    expect(formatCount(1234)).toBe('1.234');
    expect(formatCount(undefined)).toBe('0');
  });

  it('pluralizes in Portuguese', () => {
    expect(pluralize(1, 'restante', 'restantes')).toBe('restante');
    expect(pluralize(0, 'restante', 'restantes')).toBe('restante');
    expect(pluralize(2, 'restante', 'restantes')).toBe('restantes');
  });

  it('joins facts so a "·" never ends a line', () => {
    expect(joinMeta(['2020', '', '★ 8,5', null])).toBe(`2020 ·${NBSP}★ 8,5`);
    // o único lugar onde a linha pode quebrar é antes do "·"
    expect(joinMeta(['a', 'b']).split(' ')).toEqual(['a', `·${NBSP}b`]);
  });

  it('formats a TMDB day the Brazilian way, without timezone shifts', () => {
    expect(formatDay('2008-01-20')).toBe('20/01/2008');
    expect(formatDay('2008-01-20T00:00:00.000Z')).toBe('20/01/2008');
    expect(formatDay('')).toBe('');
    expect(formatDay(null)).toBe('');
  });
});
