import { describe, it, expect } from '@jest/globals';
import { FEATURED_PROVIDERS, buildOtherProviders, matchesProviderSearch } from '../../src/domain/providers.js';

const p = (provider_id, provider_name) => ({ provider_id, provider_name });

describe('FEATURED_PROVIDERS', () => {
  it('uses the TMDB ids confirmed for Brazil', () => {
    const byName = Object.fromEntries(FEATURED_PROVIDERS.map(x => [x.name, x.id]));
    expect(byName['Apple TV']).toBe('350');
    expect(byName['Paramount+']).toBe('531');
  });
});

describe('buildOtherProviders', () => {
  it('merges movie and series lists without duplicates, sorted', () => {
    expect(buildOtherProviders([p(444, 'Dekkoo'), p(300, 'Pluto TV')], [p(300, 'Pluto TV'), p(19, 'NetMovies')]).map(x => x.name))
      .toEqual(['Dekkoo', 'NetMovies', 'Pluto TV']);
  });

  it('leaves out featured providers', () => {
    expect(buildOtherProviders([p(8, 'Netflix'), p(531, 'Paramount Plus')])).toEqual([]);
  });

  it('leaves out stores, channels and duplicated variants', () => {
    const names = ['Apple TV Store', 'Amazon Video', 'Looke Amazon Channel', 'Netflix Standard with Ads', 'Paramount Plus Premium', 'Paramount Plus Apple TV channel'];
    expect(buildOtherProviders(names.map((n, i) => p(1000 + i, n)))).toEqual([]);
  });

  it('ignores invalid entries', () => {
    expect(buildOtherProviders([null, {}, p('x', 'Y'), p(1, '')])).toEqual([]);
  });
});

describe('matchesProviderSearch', () => {
  it('ignores case and accents', () => {
    expect(matchesProviderSearch('Belas Artes à La Carte', 'A LA')).toBe(true);
    expect(matchesProviderSearch('Pluto TV', 'netflix')).toBe(false);
  });

  it('an empty search matches everything', () => {
    expect(matchesProviderSearch('Pluto TV', '  ')).toBe(true);
  });
});
