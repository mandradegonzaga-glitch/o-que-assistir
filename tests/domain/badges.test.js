import { describe, it, expect } from '@jest/globals';
import {
  isBadgeEarned, computeBadgeStatuses, BADGE_DEFINITIONS, isNightOwlWatch
} from '../../src/domain/badges.js';

const makeHistory = (n) => Array.from({ length: n }, (_, i) => ({ id: i, genres: [], type: 'movie' }));

describe('isBadgeEarned', () => {
  it('Iniciante: true when history has 1 item', () => {
    expect(isBadgeEarned('Iniciante', makeHistory(1), 0)).toBe(true);
  });

  it('Iniciante: false when history is empty', () => {
    expect(isBadgeEarned('Iniciante', [], 0)).toBe(false);
  });

  it('Cinéfilo: true when history has 10 items', () => {
    expect(isBadgeEarned('Cinéfilo', makeHistory(10), 0)).toBe(true);
  });

  it('Cinéfilo: false when history has 9 items', () => {
    expect(isBadgeEarned('Cinéfilo', makeHistory(9), 0)).toBe(false);
  });

  it('Maratonista: true with 5 series, false with 4', () => {
    const series = n => Array.from({ length: n }, (_, i) => ({ id: i, type: 'tv' }));
    expect(isBadgeEarned('Maratonista', series(5), 0)).toBe(true);
    expect(isBadgeEarned('Maratonista', series(4), 0)).toBe(false);
  });

  it('Maratonista: doramas count as series', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: i, type: i % 2 ? 'tv' : 'dorama' }));
    expect(isBadgeEarned('Maratonista', items, 0)).toBe(true);
  });

  it('Crítico: true when history has 50 items', () => {
    expect(isBadgeEarned('Crítico', makeHistory(50), 0)).toBe(true);
  });

  it('Apostador: true when wins >= 5', () => {
    expect(isBadgeEarned('Apostador', [], 5)).toBe(true);
  });

  it('Apostador: false when wins < 5', () => {
    expect(isBadgeEarned('Apostador', [], 4)).toBe(false);
  });

  it('Old School: true for a title released before 2000', () => {
    expect(isBadgeEarned('Old School', [{ id: 1, year: '1999' }], 0)).toBe(true);
    expect(isBadgeEarned('Old School', [{ id: 1, year: '2000' }], 0)).toBe(false);
  });

  it('Rei do Terror: true when 3+ items have genre 27', () => {
    const history = [
      { id: 1, genres: [27], type: 'movie' },
      { id: 2, genres: [27], type: 'movie' },
      { id: 3, genres: [27], type: 'movie' }
    ];
    expect(isBadgeEarned('Rei do Terror', history, 0)).toBe(true);
  });

  it('Rei do Terror: false when fewer than 3 horror films', () => {
    const history = [
      { id: 1, genres: [27], type: 'movie' },
      { id: 2, genres: [28], type: 'movie' }
    ];
    expect(isBadgeEarned('Rei do Terror', history, 0)).toBe(false);
  });

  it('genre badges need 3 titles of the genre', () => {
    const of = (genre, n) => Array.from({ length: n }, (_, i) => ({ id: i, genres: [genre] }));
    [['Comediante', 35], ['Romântico', 10749], ['Sci-Fi Nerd', 878], ['Adrenalina', 28]].forEach(([name, genre]) => {
      expect(isBadgeEarned(name, of(genre, 3), 0)).toBe(true);
      expect(isBadgeEarned(name, of(genre, 2), 0)).toBe(false);
    });
  });

  it('Madrugador: true when something was watched at 3h local time', () => {
    const history = [{ id: 1, genres: [], type: 'movie', watchedAt: new Date(2026, 9, 28, 3, 0).toISOString() }];
    expect(isBadgeEarned('Madrugador', history, 0)).toBe(true);
  });

  it('Madrugador: false when everything was watched during the day', () => {
    const history = [{ id: 1, genres: [], type: 'movie', watchedAt: new Date(2026, 9, 28, 14, 0).toISOString() }];
    expect(isBadgeEarned('Madrugador', history, 0)).toBe(false);
  });

  it('returns false for unknown badge name', () => {
    expect(isBadgeEarned('Inexistente', makeHistory(100), 100)).toBe(false);
  });
});

describe('computeBadgeStatuses', () => {
  it('returns array with same length as BADGE_DEFINITIONS', () => {
    const result = computeBadgeStatuses([], 0);
    expect(result.length).toBe(BADGE_DEFINITIONS.length);
  });

  it('all unlocked:false for empty history and 0 wins', () => {
    const result = computeBadgeStatuses([], 0);
    expect(result.every(r => r.unlocked === false)).toBe(true);
  });

  it('Iniciante is unlocked when history has 1 item', () => {
    const result = computeBadgeStatuses(makeHistory(1), 0);
    const iniciante = result.find(r => r.badge.name === 'Iniciante');
    expect(iniciante.unlocked).toBe(true);
  });

  it('each entry has badge and unlocked properties', () => {
    const result = computeBadgeStatuses([], 0);
    result.forEach(r => {
      expect(r).toHaveProperty('badge');
      expect(r).toHaveProperty('unlocked');
    });
  });
});

describe('isNightOwlWatch', () => {
  it('true from 0h to 4h59', () => {
    expect(isNightOwlWatch({ watchedAt: new Date(2026, 0, 1, 0, 0).toISOString() })).toBe(true);
    expect(isNightOwlWatch({ watchedAt: new Date(2026, 0, 1, 4, 59).toISOString() })).toBe(true);
  });

  it('false from 5h onwards', () => {
    expect(isNightOwlWatch({ watchedAt: new Date(2026, 0, 1, 5, 0).toISOString() })).toBe(false);
    expect(isNightOwlWatch({ watchedAt: new Date(2026, 0, 1, 23, 59).toISOString() })).toBe(false);
  });

  it('false when watchedAt is missing or invalid', () => {
    expect(isNightOwlWatch({})).toBe(false);
    expect(isNightOwlWatch(null)).toBe(false);
    expect(isNightOwlWatch({ watchedAt: 'not-a-date' })).toBe(false);
  });
});
