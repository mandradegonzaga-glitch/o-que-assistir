import { describe, it, expect } from '@jest/globals';
import { MOODS, getMoodGenres } from '../../src/domain/moods.js';
import { discoverRequest, normalizeProviderIds } from '../../src/domain/filters.js';
import { buildTmdbUrl } from '../../src/api/tmdb.js';

const buildDiscoverUrl = (type, filters) => { const { path, params } = discoverRequest(type, filters); return buildTmdbUrl(path, params); };
const params = url => new URL(url).searchParams;

describe('getMoodGenres', () => {
  it('uses different genres for movies and series', () => {
    expect(getMoodGenres('adrenalina', 'movie').with).toBe('28|12');
    expect(getMoodGenres('adrenalina', 'tv').with).toBe('10759');
  });

  it('returns null for an unknown mood', () => {
    expect(getMoodGenres('xyz', 'movie')).toBe(null);
    expect(getMoodGenres('', 'tv')).toBe(null);
  });

  it('never asks for and excludes the same genre', () => {
    Object.values(MOODS).flatMap(m => [m.movie, m.tv]).forEach(({ with: wanted, without }) => {
      const excluded = without.split('|');
      wanted.split('|').forEach(id => expect(excluded).not.toContain(id));
    });
  });
});

describe('buildDiscoverUrl with mood', () => {
  it('applies genres and exclusions', () => {
    const p = params(buildDiscoverUrl('movie', { mood: 'leve' }));
    expect(p.get('with_genres')).toBe('35|10751|16');
    expect(p.get('without_genres')).toBe('27|53|80');
  });

  it('merges dorama and mood exclusions in a single parameter', () => {
    const p = params(buildDiscoverUrl('dorama', { mood: 'tensao' }));
    expect(p.getAll('without_genres')).toEqual(['16|35|10751']);
  });

  it('prefers an explicit genre over the mood', () => {
    const p = params(buildDiscoverUrl('movie', { mood: 'leve', genre: '28' }));
    expect(p.get('with_genres')).toBe('28');
    expect(p.get('without_genres')).toBe(null);
  });

  it('accepts several providers', () => {
    expect(params(buildDiscoverUrl('movie', { provider: '8|337' })).get('with_watch_providers')).toBe('8|337');
  });
});

describe('normalizeProviderIds', () => {
  it('keeps unique numeric ids as strings', () => {
    expect(normalizeProviderIds(['8', 337, '8', 'x', null])).toEqual(['8', '337']);
  });

  it('tolerates corrupted storage', () => {
    expect(normalizeProviderIds('8')).toEqual([]);
    expect(normalizeProviderIds(null)).toEqual([]);
  });
});
