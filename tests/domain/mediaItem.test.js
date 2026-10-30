import { describe, it, expect } from '@jest/globals';
import {
  getTitle, getYear, getTmdbEndpoint,
  filterValidItems, pickRandom, normalizeMediaType
} from '../../src/domain/mediaItem.js';

describe('getTitle', () => {
  it('returns title when present', () => {
    expect(getTitle({ title: 'Inception' })).toBe('Inception');
  });
  it('falls back to name when title absent', () => {
    expect(getTitle({ name: 'Breaking Bad' })).toBe('Breaking Bad');
  });
  it('returns empty string when both absent', () => {
    expect(getTitle({})).toBe('');
  });
  it('prefers title over name', () => {
    expect(getTitle({ title: 'A', name: 'B' })).toBe('A');
  });
});

describe('getYear', () => {
  it('extracts year from release_date', () => {
    expect(getYear({ release_date: '2010-07-16' })).toBe('2010');
  });
  it('falls back to first_air_date', () => {
    expect(getYear({ first_air_date: '2008-01-20' })).toBe('2008');
  });
  it('returns empty string when both absent', () => {
    expect(getYear({})).toBe('');
  });
  it('prefers release_date over first_air_date', () => {
    expect(getYear({ release_date: '2020-01-01', first_air_date: '2010-01-01' })).toBe('2020');
  });
});

describe('getTmdbEndpoint', () => {
  it('maps dorama to tv', () => {
    expect(getTmdbEndpoint('dorama')).toBe('tv');
  });
  it('passes movie through', () => {
    expect(getTmdbEndpoint('movie')).toBe('movie');
  });
  it('passes tv through', () => {
    expect(getTmdbEndpoint('tv')).toBe('tv');
  });
});

describe('filterValidItems', () => {
  const items = [
    { id: 1, poster_path: '/abc.jpg' },
    { id: 2, poster_path: null },
    { id: 3, poster_path: '/def.jpg' },
    { id: 4, poster_path: '/ghi.jpg' }
  ];

  it('removes items without poster_path', () => {
    const result = filterValidItems(items);
    expect(result.find(i => i.id === 2)).toBeUndefined();
  });
  it('removes blacklisted items', () => {
    const result = filterValidItems(items, [3]);
    expect(result.find(i => i.id === 3)).toBeUndefined();
  });
  it('keeps valid non-blacklisted items', () => {
    const result = filterValidItems(items, [3]);
    expect(result.find(i => i.id === 1)).toBeDefined();
    expect(result.find(i => i.id === 4)).toBeDefined();
  });
  it('defaults to empty blacklist', () => {
    expect(filterValidItems(items).length).toBe(3);
  });
});

describe('pickRandom', () => {
  it('returns an item from the array', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const picked = pickRandom(items);
    expect(items).toContainEqual(picked);
  });
  it('returns null for empty array', () => {
    expect(pickRandom([])).toBeNull();
  });
  it('returns null for null input', () => {
    expect(pickRandom(null)).toBeNull();
  });
  it('returns the only item for single-element array', () => {
    expect(pickRandom([{ id: 99 }])).toEqual({ id: 99 });
  });
});

describe('normalizeMediaType', () => {
  it('prefers item.media_type', () => {
    expect(normalizeMediaType({ media_type: 'tv' }, 'movie')).toBe('tv');
  });
  it('falls back to stateType when media_type absent', () => {
    expect(normalizeMediaType({}, 'movie')).toBe('movie');
  });
});
