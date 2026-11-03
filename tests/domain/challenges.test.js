import { describe, it, expect } from '@jest/globals';
import {
  CHALLENGE_XP, DAILY_CHALLENGES, WEEKLY_GOAL, applyChallengeEvent, currentChallenges, dailyChallengeFor, normalizeChallenges, weekKey
} from '../../src/domain/challenges.js';
import { EMPTY_PROGRESS, XP_LABELS, XP_REWARDS, normalizeProgress } from '../../src/domain/progress.js';

const dayAfter = (day, n) => new Date(Date.UTC(...day.split('-').map((v, i) => (i === 1 ? v - 1 : +v))) + n * 86_400_000).toISOString().slice(0, 10);

// Acha um dia cujo desafio é o pedido (para os testes não dependerem da data de hoje)
const dayWith = (id, guest = false) => {
  for (let i = 0; i < 30; i++) {
    const day = dayAfter('2026-11-01', i);
    if (dailyChallengeFor(day, { guest }).id === id) return day;
  }
  throw new Error(`nenhum dia com ${id}`);
};

describe('dailyChallengeFor', () => {
  it('is the same all day and for everyone with the same kind of profile', () => {
    expect(dailyChallengeFor('2026-11-03')).toBe(dailyChallengeFor('2026-11-03'));
  });

  it('never repeats on consecutive days, for accounts and guests', () => {
    [false, true].forEach(guest => {
      for (let i = 0; i < 60; i++) {
        const day = dayAfter('2026-11-01', i);
        expect(dailyChallengeFor(day, { guest }).id).not.toBe(dailyChallengeFor(dayAfter(day, 1), { guest }).id);
      }
    });
  });

  it('cycles through every challenge', () => {
    const seen = new Set();
    for (let i = 0; i < DAILY_CHALLENGES.length; i++) seen.add(dailyChallengeFor(dayAfter('2026-11-01', i)).id);
    expect(seen.size).toBe(DAILY_CHALLENGES.length);
  });

  it('never gives a guest a challenge that needs friends', () => {
    for (let i = 0; i < 30; i++) expect(dailyChallengeFor(dayAfter('2026-11-01', i), { guest: true }).account).toBeFalsy();
  });
});

describe('weekKey', () => {
  it('weeks start on Monday', () => {
    expect(weekKey('2026-11-02')).toBe('2026-11-02'); // segunda
    expect(weekKey('2026-11-08')).toBe('2026-11-02'); // domingo
    expect(weekKey('2026-11-09')).toBe('2026-11-09');
    expect(weekKey('2027-01-01')).toBe('2026-12-28'); // virada de ano
  });
});

describe('applyChallengeEvent', () => {
  it('counts the daily challenge up to the goal and reports it once', () => {
    const day = dayWith('save2');
    const one = applyChallengeEvent(null, 'saved', {}, day);
    expect(one.completed).toEqual([]);
    expect(one.challenges).toMatchObject({ day, dailyId: 'save2', daily: 1 });
    const two = applyChallengeEvent(one.challenges, 'saved', {}, day);
    expect(two.completed).toEqual(['daily']);
    expect(applyChallengeEvent(two.challenges, 'saved', {}, day)).toBe(null);
  });

  it('ignores events of other challenges', () => {
    expect(applyChallengeEvent(null, 'roulette', null, dayWith('save2'))).toBe(null);
  });

  it('checks the title when the challenge asks for it', () => {
    const horror = dayWith('horror');
    expect(applyChallengeEvent(null, 'opened', { genre_ids: [35] }, horror)).toBe(null);
    expect(applyChallengeEvent(null, 'opened', { genre_ids: [27, 53] }, horror).completed).toEqual(['daily']);
    expect(applyChallengeEvent(null, 'opened', { genres: [{ id: 27, name: 'Terror' }] }, horror).completed).toEqual(['daily']);

    const classic = dayWith('classic');
    expect(applyChallengeEvent(null, 'opened', { release_date: '2004-05-01' }, classic)).toBe(null);
    expect(applyChallengeEvent(null, 'opened', { first_air_date: '1994-09-22' }, classic).completed).toEqual(['daily']);
    expect(applyChallengeEvent(null, 'opened', {}, classic)).toBe(null);
  });

  it('starts over the next day', () => {
    const day = dayWith('open3');
    const done = applyChallengeEvent({ day, dailyId: 'open3', daily: 3 }, 'opened', {}, day);
    expect(done).toBe(null);
    const tomorrow = currentChallenges({ day, dailyId: 'open3', daily: 3 }, dayAfter(day, 1));
    expect(tomorrow.daily).toMatchObject({ count: 0, done: false });
  });

  it('the weekly goal adds up across the week and resets on Monday', () => {
    const monday = '2026-11-02';
    let c = null;
    ['2026-11-02', '2026-11-04', '2026-11-08'].forEach((day, i) => {
      const r = applyChallengeEvent(c, 'watched', {}, day);
      c = r.challenges;
      expect(c.weekly).toBe(i + 1);
      if (i === 2) expect(r.completed).toContain('weekly');
    });
    expect(c.week).toBe(monday);
    expect(currentChallenges(c, '2026-11-09').weekly.count).toBe(0);
  });

  it('watching on a "watch 1" day can finish both at once', () => {
    const day = dayWith('watch1');
    const r = applyChallengeEvent({ week: weekKey(day), weekly: 2 }, 'watched', {}, day);
    expect(r.completed).toEqual(['daily', 'weekly']);
  });

  it('a stored challenge from another pool (guest became account) starts over', () => {
    const day = dayWith('share');
    const other = dailyChallengeFor(day, { guest: true }).id;
    expect(currentChallenges({ day, dailyId: other, daily: 1 }, day).daily).toMatchObject({ id: 'share', count: 0 });
  });
});

describe('challenge data in progress', () => {
  it('survives corrupted data', () => {
    expect(normalizeChallenges('x')).toEqual({ day: null, dailyId: null, daily: 0, week: null, weekly: 0 });
    expect(normalizeChallenges({ day: 3, daily: -1, weekly: 1.5 })).toEqual(normalizeChallenges());
    expect(normalizeProgress({ xp: 10 }).challenges).toEqual(EMPTY_PROGRESS.challenges);
  });

  it('keeps what was saved', () => {
    const saved = { day: '2026-11-03', dailyId: 'save2', daily: 1, week: '2026-11-02', weekly: 2 };
    expect(normalizeProgress({ challenges: saved }).challenges).toEqual(saved);
  });

  it('pays the XP and names it in the log', () => {
    expect(XP_REWARDS.daily).toBe(CHALLENGE_XP.daily);
    expect(XP_REWARDS.weekly).toBe(CHALLENGE_XP.weekly);
    expect(XP_LABELS.daily).toBe('Desafio do dia');
    expect(XP_LABELS.weekly).toBe('Meta da semana');
  });

  it('every challenge has an icon that exists and a positive goal', async () => {
    const { BADGE_ICONS } = await import('../../src/ui/badgeIcons.js');
    [...DAILY_CHALLENGES, WEEKLY_GOAL].forEach(c => {
      expect(BADGE_ICONS[c.icon]).toContain('<svg');
      expect(c.goal).toBeGreaterThan(0);
    });
  });
});
