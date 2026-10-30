import { describe, it, expect } from '@jest/globals';
import {
  deduplicateHistory, trimHistory,
  createSorteioEntry, createWatchedEntry
} from '../../src/domain/history.js';

describe('deduplicateHistory', () => {
  it('prepends new item at index 0', () => {
    const result = deduplicateHistory([], { id: 1, title: 'A' });
    expect(result[0].id).toBe(1);
  });

  it('removes existing entry with same id', () => {
    const history = [{ id: 1, title: 'Old' }, { id: 2, title: 'B' }];
    const result = deduplicateHistory(history, { id: 1, title: 'New' });
    expect(result.filter(h => h.id === 1).length).toBe(1);
    expect(result[0].title).toBe('New');
  });

  it('keeps other entries intact', () => {
    const history = [{ id: 2, title: 'B' }, { id: 3, title: 'C' }];
    const result = deduplicateHistory(history, { id: 1, title: 'A' });
    expect(result.length).toBe(3);
  });

  it('works with empty history', () => {
    const result = deduplicateHistory([], { id: 5, title: 'X' });
    expect(result).toEqual([{ id: 5, title: 'X' }]);
  });
});

describe('trimHistory', () => {
  it('enforces maxSize limit', () => {
    const history = Array.from({ length: 60 }, (_, i) => ({ id: i }));
    expect(trimHistory(history, 50).length).toBe(50);
  });

  it('keeps first N items (most recent)', () => {
    const history = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = trimHistory(history, 2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('is a no-op when under limit', () => {
    const history = [{ id: 1 }, { id: 2 }];
    expect(trimHistory(history, 50).length).toBe(2);
  });
});

describe('createSorteioEntry', () => {
  it('maps id, title, poster_path, media_type', () => {
    const item = { id: 42, title: 'Inception', poster_path: '/abc.jpg', media_type: 'movie' };
    const entry = createSorteioEntry(item);
    expect(entry).toEqual({ id: 42, title: 'Inception', poster_path: '/abc.jpg', media_type: 'movie' });
  });

  it('falls back to name when title absent', () => {
    const entry = createSorteioEntry({ id: 1, name: 'Breaking Bad', poster_path: null });
    expect(entry.title).toBe('Breaking Bad');
  });

  it('defaults media_type to movie when absent', () => {
    const entry = createSorteioEntry({ id: 1, title: 'X' });
    expect(entry.media_type).toBe('movie');
  });
});

describe('createWatchedEntry', () => {
  it('maps year from release_date', () => {
    const entry = createWatchedEntry({ id: 1, title: 'A', release_date: '2020-05-10' }, 'movie');
    expect(entry.year).toBe('2020');
  });

  it('maps year from first_air_date for TV', () => {
    const entry = createWatchedEntry({ id: 2, name: 'Series', first_air_date: '2015-03-01' }, 'tv');
    expect(entry.year).toBe('2015');
  });

  it('maps genre_ids correctly', () => {
    const entry = createWatchedEntry({ id: 1, title: 'X', genre_ids: [28, 12] }, 'movie');
    expect(entry.genres).toEqual([28, 12]);
  });

  it('maps genres array when genre_ids absent', () => {
    const entry = createWatchedEntry({ id: 1, title: 'X', genres: [{ id: 18 }, { id: 35 }] }, 'movie');
    expect(entry.genres).toEqual([18, 35]);
  });
});
