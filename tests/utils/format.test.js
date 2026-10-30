import { describe, it, expect } from '@jest/globals';
import { formatRating, formatCount, formatDate, pluralize } from '../../src/utils/format.js';

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

  it('keeps the calendar day of TMDB dates', () => {
    expect(formatDate('2024-01-01')).toBe('1 de janeiro de 2024');
  });

  it('returns empty for missing or invalid dates', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate('abc')).toBe('');
  });

  it('pluralizes in Portuguese', () => {
    expect(pluralize(1, 'restante', 'restantes')).toBe('restante');
    expect(pluralize(0, 'restante', 'restantes')).toBe('restante');
    expect(pluralize(2, 'restante', 'restantes')).toBe('restantes');
  });
});
