import { describe, it, expect } from '@jest/globals';
import { PICK_KINDS, choosePick, msUntilMidnight, pickRequest, pickSlot } from '../../src/domain/dailyPicks.js';

const dayAfter = (day, n) => new Date(Date.UTC(...day.split('-').map((v, i) => (i === 1 ? v - 1 : +v))) + n * 86_400_000).toISOString().slice(0, 10);
const key = slot => `${slot.page}:${slot.index}`;

describe('pickSlot', () => {
  it('is the same all day', () => {
    expect(pickSlot(0, '2026-11-03')).toEqual(pickSlot(0, '2026-11-03'));
  });

  it('goes through the whole pool before repeating', () => {
    PICK_KINDS.forEach((kind, k) => {
      const size = kind.pages * 20;
      const seen = new Set();
      for (let i = 0; i < size; i++) seen.add(key(pickSlot(k, dayAfter('2026-11-01', i))));
      expect(seen.size).toBe(size);
      expect(key(pickSlot(k, dayAfter('2026-11-01', size)))).toBe(key(pickSlot(k, '2026-11-01')));
    });
  });

  it('stays inside the pages that exist', () => {
    PICK_KINDS.forEach((kind, k) => {
      for (let i = 0; i < 400; i++) {
        const { page, index } = pickSlot(k, dayAfter('2025-01-01', i));
        expect(page).toBeGreaterThanOrEqual(1);
        expect(page).toBeLessThanOrEqual(kind.pages);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(20);
      }
    });
  });

  it('consecutive days fall on different pages', () => {
    for (let i = 0; i < 30; i++) {
      const day = dayAfter('2026-11-01', i);
      expect(pickSlot(0, day).page).not.toBe(pickSlot(0, dayAfter(day, 1)).page);
    }
  });
});

describe('pickRequest', () => {
  it('asks the TMDB for well rated titles of each kind', () => {
    const [movie, tv, dorama] = PICK_KINDS.map((_, k) => pickRequest(k, '2026-11-03'));
    expect(movie.path).toBe('/discover/movie');
    expect(tv.path).toBe('/discover/tv');
    expect(dorama.path).toBe('/discover/tv');
    expect(dorama.params.with_origin_country).toBe('KR');
    expect(tv.params.with_origin_country).toBeUndefined();
    [movie, tv, dorama].forEach(r => {
      expect(r.params.sort_by).toBe('vote_count.desc');
      expect(r.params['vote_average.gte']).toBeGreaterThanOrEqual(7);
      expect(r.params.page).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('choosePick', () => {
  const item = (id, extra = {}) => ({ id, poster_path: `/${id}.jpg`, ...extra });

  it('takes the title at the chosen position', () => {
    expect(choosePick([item(1), item(2), item(3)], 1, 'movie').id).toBe(2);
  });

  it('skips titles without poster and wraps around a short page', () => {
    expect(choosePick([item(1), { id: 2 }, item(3)], 1, 'movie').id).toBe(3);
    expect(choosePick([item(1), item(2)], 7, 'movie').id).toBe(2);
    expect(choosePick([{ id: 1 }, item(2)], 1, 'movie').id).toBe(2);
  });

  it('leaves Korean shows for the dorama card', () => {
    const list = [item(1, { origin_country: ['KR'] }), item(2, { origin_country: ['US'] })];
    expect(choosePick(list, 0, 'tv').id).toBe(2);
    expect(choosePick(list, 0, 'dorama').id).toBe(1);
  });

  it('returns null when nothing works', () => {
    expect(choosePick([], 0, 'movie')).toBe(null);
    expect(choosePick(undefined, 0, 'movie')).toBe(null);
    expect(choosePick([{ id: 1 }], 0, 'movie')).toBe(null);
  });
});

describe('msUntilMidnight', () => {
  it('counts to just after the next local midnight', () => {
    expect(msUntilMidnight(new Date(2026, 10, 3, 23, 59, 0))).toBe(61_000);
    expect(msUntilMidnight(new Date(2026, 10, 3, 0, 0, 1))).toBe(86_400_000);
  });
});
