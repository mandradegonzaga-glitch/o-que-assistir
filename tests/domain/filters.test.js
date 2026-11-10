import { describe, it, expect } from '@jest/globals';
import { BASE_URL as BASE } from '../../src/config/constants.js';
import { buildTmdbUrl } from '../../src/api/tmdb.js';
import { discoverRequest, getRandomPage, hasLatinTitle, releaseWindow } from '../../src/domain/filters.js';

// URL final, como o app pede ao TMDB
const buildDiscoverUrl = (type, filters) => {
  const { path, params } = discoverRequest(type, filters);
  return decodeURIComponent(buildTmdbUrl(path, params));
};

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

  it('sem plataforma escolhida, só o que já dá para ver em streaming no Brasil', () => {
    const url = buildDiscoverUrl('movie', {});
    expect(url).toContain('with_watch_monetization_types=flatrate|free|ads');
    expect(url).toContain('watch_region=BR');
  });

  it('streaming: false (Top 10) também traz o que só está no cinema', () => {
    const url = buildDiscoverUrl('movie', { streaming: false });
    expect(url).not.toContain('with_watch_monetization_types');
    expect(url).not.toContain('watch_region');
  });

  it('dorama: série coreana sem animação', () => {
    const url = buildDiscoverUrl('dorama', {});
    expect(url).toContain('with_origin_country=KR');
    expect(url).toContain('without_genres=16');
  });

  it('filme não leva os filtros de dorama', () => {
    const url = buildDiscoverUrl('movie', {});
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

describe('lançamentos', () => {
  const today = new Date(2026, 10, 6);

  it('releaseWindow: 45 days for movies, 60 for series', () => {
    expect(releaseWindow('movie', today)).toEqual({ from: '2026-09-22', to: '2026-11-06', days: 45 });
    expect(releaseWindow('tv', today)).toEqual({ from: '2026-09-07', to: '2026-11-06', days: 60 });
  });

  it('movies: digital releases in Brazil, ignoring the chosen years', () => {
    const url = buildDiscoverUrl('movie', { genre: '27', yearFrom: '1990', releases: { today }, minVotes: 0 });
    expect(url).toContain('&with_genres=27');
    expect(url).toContain('&release_date.gte=2026-09-22&release_date.lte=2026-11-06&with_release_type=4&region=BR');
    expect(url).not.toContain('1990');
  });

  it('lançamentos têm a regra própria, sem o filtro de streaming', () => {
    expect(buildDiscoverUrl('movie', { releases: { today } })).not.toContain('with_watch_monetization_types');
  });

  it('series and doramas: first air date', () => {
    const url = buildDiscoverUrl('dorama', { releases: { today } });
    expect(url).toContain('with_origin_country=KR');
    expect(url).toContain('&first_air_date.gte=2026-09-07&first_air_date.lte=2026-11-06');
    expect(url).not.toContain('with_release_type');
  });

  it('hasLatinTitle drops titles with no Latin letter', () => {
    expect(hasLatinTitle({ name: 'Amor Disfarçado' })).toBe(true);
    expect(hasLatinTitle({ title: 'Ç' })).toBe(true);
    expect(hasLatinTitle({ name: '조선슬화핌' })).toBe(false);
    expect(hasLatinTitle({ name: 'กฎหลังเที่ยงคืน' })).toBe(false);
    expect(hasLatinTitle({})).toBe(false);
  });
});

describe('país de origem', () => {
  it('adds the country, except for doramas (always Korean)', () => {
    expect(buildDiscoverUrl('movie', { country: 'FR' })).toContain('&with_origin_country=FR');
    const dorama = buildDiscoverUrl('dorama', { country: 'FR' });
    expect(dorama).toContain('with_origin_country=KR');
    expect(dorama).not.toContain('FR');
  });
});

describe('Natal (palavra-chave, não gênero)', () => {
  it('vira with_keywords e não manda with_genres', () => {
    const url = buildDiscoverUrl('movie', { genre: 'natal' });
    expect(url).toContain('&with_keywords=207317');
    expect(url).not.toContain('with_genres');
  });

  it('vale também para séries e mantém o "sem animação" do dorama', () => {
    const url = buildDiscoverUrl('dorama', { genre: 'natal' });
    expect(url).toContain('&with_keywords=207317');
    expect(url).toContain('&without_genres=16');
  });
});
