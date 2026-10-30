import { describe, it, expect } from '@jest/globals';
import { BASE_URL } from '../../src/config/constants.js';
import { buildDiscoverUrl, getRandomPage } from '../../src/domain/filters.js';

const BASE = BASE_URL;

describe('buildDiscoverUrl', () => {
  it('builds base URL for movie with no filters', () => {
    const url = buildDiscoverUrl('movie', {});
    expect(url).toContain(`${BASE}/discover/movie`);
    expect(url).not.toContain('api_key');
    expect(url).toContain('vote_count.gte=50');
  });

  it('appends genre when provided', () => {
    const url = buildDiscoverUrl('movie', { genre: '28' });
    expect(url).toContain('with_genres=28');
  });

  it('appends provider when provided', () => {
    const url = buildDiscoverUrl('movie', { provider: '8' });
    expect(url).toContain('with_watch_providers=8');
    expect(url).toContain('watch_region=BR');
  });

  it('adds dorama filters when isDorama=true', () => {
    const url = buildDiscoverUrl('tv', { isDorama: true });
    expect(url).toContain('with_origin_country=KR');
    expect(url).toContain('without_genres=16');
  });

  it('does NOT add dorama filters when isDorama=false', () => {
    const url = buildDiscoverUrl('movie', { isDorama: false });
    expect(url).not.toContain('with_origin_country=KR');
  });

  it('duration short adds lte=90', () => {
    const url = buildDiscoverUrl('movie', { duration: 'short' });
    expect(url).toContain('with_runtime.lte=90');
  });

  it('duration medium adds gte=90 and lte=120', () => {
    const url = buildDiscoverUrl('movie', { duration: 'medium' });
    expect(url).toContain('with_runtime.gte=90');
    expect(url).toContain('with_runtime.lte=120');
  });

  it('duration long adds gte=120', () => {
    const url = buildDiscoverUrl('movie', { duration: 'long' });
    expect(url).toContain('with_runtime.gte=120');
  });

  it('year range uses primary_release_date for movies', () => {
    const url = buildDiscoverUrl('movie', { yearFrom: '2000', yearTo: '2010' });
    expect(url).toContain('primary_release_date.gte=2000-01-01');
    expect(url).toContain('primary_release_date.lte=2010-12-31');
  });

  it('year range uses first_air_date for TV', () => {
    const url = buildDiscoverUrl('tv', { yearFrom: '2000', yearTo: '2010' });
    expect(url).toContain('first_air_date.gte=2000-01-01');
    expect(url).toContain('first_air_date.lte=2010-12-31');
  });

  it('yearFrom defaults to 1900 when empty', () => {
    const url = buildDiscoverUrl('movie', { yearTo: '2020' });
    expect(url).toContain('primary_release_date.gte=1900-01-01');
  });

  it('adds personId filter when provided', () => {
    const url = buildDiscoverUrl('movie', { personId: 123 });
    expect(url).toContain('with_people=123');
  });
});

describe('getRandomPage', () => {
  it('returns integer between 1 and max inclusive', () => {
    for (let i = 0; i < 100; i++) {
      const p = getRandomPage(5);
      expect(p).toBeGreaterThanOrEqual(1);
      expect(p).toBeLessThanOrEqual(5);
      expect(Number.isInteger(p)).toBe(true);
    }
  });

  it('never returns 0 or below', () => {
    for (let i = 0; i < 50; i++) {
      expect(getRandomPage(1)).toBe(1);
    }
  });
});
