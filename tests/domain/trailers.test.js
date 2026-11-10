import { describe, it, expect } from '@jest/globals';
import { rankTrailers } from '../../src/domain/trailers.js';

const v = (key, type, extra = {}) => ({ key, type, site: 'YouTube', ...extra });

describe('rankTrailers', () => {
  it('puts trailers before teasers and before anything else', () => {
    expect(rankTrailers([v('clip', 'Clip'), v('teaser', 'Teaser'), v('trailer', 'Trailer')]))
      .toEqual(['trailer', 'teaser', 'clip']);
  });

  it('prefers official, then the newest', () => {
    const list = [
      v('old', 'Trailer', { official: true, published_at: '2014-09-17' }),
      v('fan', 'Trailer', { official: false, published_at: '2024-01-01' }),
      v('new', 'Trailer', { official: true, published_at: '2023-11-23' }),
    ];
    expect(rankTrailers(list)).toEqual(['new', 'old', 'fan']);
  });

  it('keeps only YouTube videos with a key', () => {
    expect(rankTrailers([v('a', 'Trailer', { site: 'Vimeo' }), v('', 'Trailer'), v('b', 'Trailer')])).toEqual(['b']);
  });

  it('handles an empty or missing list', () => {
    expect(rankTrailers()).toEqual([]);
    expect(rankTrailers([])).toEqual([]);
  });
});
