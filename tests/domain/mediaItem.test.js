import { describe, it, expect } from '@jest/globals';
import {
  getTitle, getYear, getTmdbEndpoint
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
