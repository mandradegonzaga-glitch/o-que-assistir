import { describe, it, expect } from '@jest/globals';
import { collectLegacyData, hasLegacyData, stripPasswords } from '../../src/domain/legacyData.js';

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
    expect(collectLegacyData({ allUsers: 'x', watchlist: 'y', vistos: 3 })).toEqual({ history: [], watchlist: [], rouletteWins: 0 });
    expect(collectLegacyData({ allUsers: { a: null } }).history).toEqual([]);
  });
});

describe('hasLegacyData', () => {
  it('is true with history or watchlist only', () => {
    expect(hasLegacyData({ history: [1], watchlist: [] })).toBe(true);
    expect(hasLegacyData({ history: [], watchlist: [1] })).toBe(true);
    expect(hasLegacyData({ history: [], watchlist: [] })).toBe(false);
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
