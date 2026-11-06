import { describe, it, expect } from '@jest/globals';
import {
  MAX_EPISODE_MINUTES, TV_FACTS_TTL_MS, computeLifeStats, factsKey, formatWatchTime, isFresh, missingFacts, titleFacts, titleMinutes
} from '../../src/domain/lifeStats.js';

const actor = (id, name) => ({ id, name });

describe('factsKey', () => {
  it('uses "movie" for movies (and missing type) and "tv" for series and doramas', () => {
    expect(factsKey('movie', 1)).toBe('movie:1');
    expect(factsKey(undefined, 1)).toBe('movie:1');
    expect(factsKey('tv', 2)).toBe('tv:2');
    expect(factsKey('dorama', 2)).toBe('tv:2');
  });
});

describe('titleFacts', () => {
  it('keeps runtime and the first 5 cast members of a movie', () => {
    const f = titleFacts({ runtime: 146, credits: { cast: [1, 2, 3, 4, 5, 6].map(i => actor(i, `A${i}`)) } }, 'movie', 7);
    expect(f).toEqual({ runtime: 146, cast: [[1, 'A1'], [2, 'A2'], [3, 'A3'], [4, 'A4'], [5, 'A5']], at: 7 });
  });

  it('averages episode_run_time for series', () => {
    expect(titleFacts({ episode_run_time: [40, 50], number_of_episodes: 10 }, 'tv', 1))
      .toEqual({ episodeRuntime: 45, episodes: 10, cast: [], at: 1 });
  });

  it('falls back to the last episode, capped, when there is no average', () => {
    const f = titleFacts({ episode_run_time: [], last_episode_to_air: { runtime: 129 }, number_of_episodes: 42 }, 'tv');
    expect(f.episodeRuntime).toBe(MAX_EPISODE_MINUTES);
    expect(titleFacts({ last_episode_to_air: { runtime: 30 } }, 'dorama').episodeRuntime).toBe(30);
  });

  it('stores null for missing or zero durations and ignores broken cast entries', () => {
    expect(titleFacts({ runtime: 0, credits: { cast: [null, { id: 1 }, { name: 'x' }] } }, 'movie', 1))
      .toEqual({ runtime: null, cast: [], at: 1 });
    expect(titleFacts({}, 'tv', 1)).toEqual({ episodeRuntime: null, episodes: null, cast: [], at: 1 });
  });
});

describe('isFresh', () => {
  it('keeps movies forever and refreshes series after 30 days', () => {
    expect(isFresh({ at: 0 }, 'movie', 10 ** 13)).toBe(true);
    expect(isFresh({ at: 0 }, 'tv', TV_FACTS_TTL_MS - 1)).toBe(true);
    expect(isFresh({ at: 0 }, 'tv', TV_FACTS_TTL_MS)).toBe(false);
    expect(isFresh(undefined, 'movie')).toBe(false);
  });
});

describe('titleMinutes', () => {
  it('uses the runtime for movies', () => {
    expect(titleMinutes({ type: 'movie' }, { runtime: 120 })).toBe(120);
    expect(titleMinutes({ type: 'movie' }, { runtime: null })).toBeNull();
  });

  it('uses marked episodes, or the whole series when none were marked', () => {
    const f = { episodeRuntime: 50, episodes: 20 };
    expect(titleMinutes({ type: 'tv' }, f, 3)).toBe(150);
    expect(titleMinutes({ type: 'dorama' }, f)).toBe(1000);
    expect(titleMinutes({ type: 'tv' }, { episodeRuntime: null, episodes: 20 })).toBeNull();
    expect(titleMinutes({ type: 'tv' }, undefined)).toBeNull();
  });
});

describe('computeLifeStats', () => {
  const facts = {
    'movie:1': { runtime: 100, cast: [[10, 'Ana'], [11, 'Bia']] },
    'movie:2': { runtime: 120, cast: [[10, 'Ana'], [12, 'Caio']] },
    'tv:3': { episodeRuntime: 45, episodes: 10, cast: [[12, 'Caio'], [10, 'Ana']] },
    'tv:4': { episodeRuntime: 60, episodes: 8, cast: [[11, 'Bia']] },
  };

  it('adds movies, whole series and in-progress episodes', () => {
    const history = [{ id: 1, type: 'movie' }, { id: 2, type: 'movie' }, { id: 3, type: 'tv' }];
    const stats = computeLifeStats(history, facts, [{ id: 4, type: 'dorama', episodes: 2 }]);
    expect(stats.minutes).toBe(100 + 120 + 450 + 120);
    expect(stats.counted).toBe(4);
    expect(stats.missing).toBe(0);
  });

  it('uses marked episodes for a watched series that has them', () => {
    const stats = computeLifeStats([{ id: 3, type: 'tv' }], facts, [{ id: 3, type: 'tv', episodes: 4 }]);
    expect(stats.minutes).toBe(180);
    expect(stats.counted).toBe(1);
  });

  it('finds the actor seen in most titles (in-progress series do not count)', () => {
    const history = [{ id: 1, type: 'movie' }, { id: 2, type: 'movie' }, { id: 3, type: 'tv' }];
    expect(computeLifeStats(history, facts, [{ id: 4, type: 'tv', episodes: 1 }]).topActor)
      .toEqual({ id: 10, name: 'Ana', count: 3 });
  });

  it('needs an actor in at least 2 titles and breaks ties by name', () => {
    expect(computeLifeStats([{ id: 1, type: 'movie' }], facts).topActor).toBeNull();
    const tie = { 'movie:1': { runtime: 1, cast: [[2, 'Zé'], [1, 'Ana']] }, 'movie:2': { runtime: 1, cast: [[2, 'Zé'], [1, 'Ana']] } };
    expect(computeLifeStats([{ id: 1, type: 'movie' }, { id: 2, type: 'movie' }], tie).topActor.name).toBe('Ana');
  });

  it('counts titles without details as missing and ignores duplicates', () => {
    const stats = computeLifeStats([{ id: 1, type: 'movie' }, { id: 1, type: 'movie' }, { id: 99, type: 'movie' }], facts);
    expect(stats).toMatchObject({ minutes: 100, counted: 1, missing: 1 });
  });

  it('works with nothing', () => {
    expect(computeLifeStats([], {})).toEqual({ minutes: 0, counted: 0, missing: 0, topActor: null });
    expect(computeLifeStats(undefined, {}, [])).toEqual({ minutes: 0, counted: 0, missing: 0, topActor: null });
  });
});

describe('formatWatchTime', () => {
  it('shows minutes under an hour and rounded hours with Brazilian separators', () => {
    expect(formatWatchTime(0)).toBe('0 min');
    expect(formatWatchTime(45)).toBe('45 min');
    expect(formatWatchTime(90)).toBe('2 h');
    expect(formatWatchTime(75_000)).toBe('1.250 h');
  });
});

describe('missingFacts', () => {
  it('lists each title once, skipping the ones already fresh', () => {
    const now = TV_FACTS_TTL_MS * 2;
    const facts = { 'movie:1': { at: 0 }, 'tv:2': { at: now - 1 }, 'tv:3': { at: 0 } };
    const titles = [{ id: 1, type: 'movie' }, { id: 2, type: 'tv' }, { id: 3, type: 'dorama' }, { id: 4 }, { id: 4 }];
    expect(missingFacts(titles, facts, now)).toEqual([{ id: 3, type: 'dorama' }, { id: 4 }]);
  });
});

