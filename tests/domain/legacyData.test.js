import { describe, it, expect } from '@jest/globals';
import { collectLegacyData, hasLegacyData, normalizeEpisodes, stripPasswords } from '../../src/domain/legacyData.js';

const item = (id, extra = {}) => ({ id, title: `T${id}`, poster: `/${id}.jpg`, type: 'movie', ...extra });

describe('collectLegacyData', () => {
  it('uses the active profile when it has history', () => {
    const data = collectLegacyData({
      currentUser: 'ana',
      allUsers: { ana: { history: [item(1)], rouletteWins: 3 }, bia: { history: [item(2)], rouletteWins: 9 } },
    });
    expect(data.history.map(i => i.id)).toEqual([1]);
    expect(data.rouletteWins).toBe(3);
  });

  it('merges every profile when the active one is empty or missing', () => {
    const data = collectLegacyData({
      currentUser: null,
      allUsers: { ana: { history: [item(1)], rouletteWins: 1 }, bia: { history: [item(2), item(1)], rouletteWins: 5 } },
    });
    expect(data.history.map(i => i.id)).toEqual([1, 2]);
    expect(data.rouletteWins).toBe(5);
  });

  it('prefers profiles over vistos, which keeps removed titles', () => {
    const data = collectLegacyData({ allUsers: { ana: { history: [item(1)] } }, currentUser: 'ana', vistos: [item(1), item(99)] });
    expect(data.history.map(i => i.id)).toEqual([1]);
  });

  it('falls back to vistos without profiles', () => {
    expect(collectLegacyData({ vistos: [item(7)] }).history.map(i => i.id)).toEqual([7]);
  });

  it('drops invalid items and normalizes the rest', () => {
    const data = collectLegacyData({ watchlist: [null, { id: 'x' }, { id: 5, name: 'Nome', type: 'outro' }] });
    expect(data.watchlist).toEqual([{ id: 5, title: 'Nome', poster: null, type: 'movie', year: null, genres: [] }]);
  });

  it('survives corrupted storage', () => {
    expect(collectLegacyData({ allUsers: 'x', watchlist: 'y', vistos: 3 })).toEqual({ history: [], watchlist: [], rouletteWins: 0, series: [] });
    expect(collectLegacyData({ allUsers: { a: null } }).history).toEqual([]);
  });
});

describe('hasLegacyData', () => {
  it('is true with history or watchlist only', () => {
    expect(hasLegacyData({ history: [1], watchlist: [] })).toBe(true);
    expect(hasLegacyData({ history: [], watchlist: [1] })).toBe(true);
    expect(hasLegacyData({ history: [], watchlist: [] })).toBe(false);
  });

  it('is true with only series progress', () => {
    expect(hasLegacyData({ history: [], watchlist: [], series: [{ id: 1 }] })).toBe(true);
    expect(hasLegacyData({ history: [], watchlist: [], series: [] })).toBe(false);
  });
});

describe('normalizeEpisodes', () => {
  it('turns guest keys into season and episode numbers', () => {
    const data = { 1396: { id: 1396, title: 'Breaking Bad', poster: '/bb.jpg', type: 'tv', keys: ['1396-s1-e1', '1396-s3-e12'] } };
    expect(normalizeEpisodes(data)).toEqual([{
      id: 1396, title: 'Breaking Bad', poster: '/bb.jpg', type: 'tv',
      episodes: [{ season_number: 1, episode_number: 1 }, { season_number: 3, episode_number: 12 }],
    }]);
  });

  it('keeps doramas as dorama and anything else as tv', () => {
    const data = { 5: { id: 5, type: 'dorama', keys: ['5-s1-e1'] }, 6: { id: 6, type: 'movie', keys: ['6-s1-e1'] } };
    expect(normalizeEpisodes(data).map(s => s.type)).toEqual(['dorama', 'tv']);
    expect(normalizeEpisodes(data)[0].title).toBe('Sem título');
  });

  it('drops broken keys, keys of other series, repeats and empty series', () => {
    const data = {
      7: { id: 7, keys: ['7-s1-e1', '7-s1-e1', 'x', '8-s1-e1', '7-s1', 42] },
      9: { id: 9, keys: [] },
      10: { id: 'abc', keys: ['10-s1-e1'] },
      11: null,
    };
    expect(normalizeEpisodes(data)).toEqual([{ id: 7, title: 'Sem título', poster: null, type: 'tv', episodes: [{ season_number: 1, episode_number: 1 }] }]);
  });

  it('survives corrupted storage', () => {
    expect(normalizeEpisodes(null)).toEqual([]);
    expect(normalizeEpisodes('x')).toEqual([]);
    expect(normalizeEpisodes([1, 2])).toEqual([]);
  });

  it('comes in collectLegacyData from the guest', () => {
    const data = collectLegacyData({ guest: { episodes: { 3: { id: 3, title: 'S', keys: ['3-s2-e5'] } } } });
    expect(data.series.map(s => s.id)).toEqual([3]);
    expect(hasLegacyData(data)).toBe(true);
  });
});

describe('stripPasswords', () => {
  it('removes passwords and keeps the rest', () => {
    expect(stripPasswords({ ana: { password: 'x', history: [1] }, guest: { password: null } })).toEqual({ ana: { history: [1] }, guest: {} });
  });

  it('tolerates invalid values', () => {
    expect(stripPasswords(null)).toBe(null);
    expect(stripPasswords({ a: null })).toEqual({ a: null });
  });
});
