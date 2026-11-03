import { describe, it, expect } from '@jest/globals';
import { EMPTY_PROGRESS, LEVELS, addXp, applyDailyVisit, bumpSocial, getLevel, localDay, normalizeProgress } from '../../src/domain/progress.js';

const visit = (progress, day) => applyDailyVisit(progress, day);

describe('applyDailyVisit', () => {
  it('starts at 1 and gives the daily XP', () => {
    const p = visit(EMPTY_PROGRESS, '2026-10-30');
    expect(p).toMatchObject({ streak: 1, bestStreak: 1, xp: 5, lastVisit: '2026-10-30' });
  });

  it('returns null on a second visit the same day', () => {
    expect(visit(visit(EMPTY_PROGRESS, '2026-10-30'), '2026-10-30')).toBe(null);
  });

  it('continues on the next day, across months and years', () => {
    const p = { ...EMPTY_PROGRESS, streak: 3, bestStreak: 3, lastVisit: '2026-12-31' };
    expect(visit(p, '2027-01-01').streak).toBe(4);
  });

  it('resets after a missed day but keeps the record', () => {
    const p = { ...EMPTY_PROGRESS, streak: 9, bestStreak: 9, lastVisit: '2026-10-28' };
    expect(visit(p, '2026-10-30')).toMatchObject({ streak: 1, bestStreak: 9 });
  });

  it('treats a daylight saving change as one day', () => {
    const p = { ...EMPTY_PROGRESS, streak: 1, bestStreak: 1, lastVisit: '2026-03-08' };
    expect(visit(p, '2026-03-09').streak).toBe(2);
  });
});

describe('addXp', () => {
  it('adds the reward and keeps the 5 latest entries', () => {
    let p = EMPTY_PROGRESS;
    for (let i = 0; i < 7; i++) p = addXp(p, 'watched');
    expect(p.xp).toBe(140);
    expect(p.log).toHaveLength(5);
  });

  it('ignores unknown actions', () => {
    expect(addXp(EMPTY_PROGRESS, 'x').xp).toBe(0);
  });
});

describe('getLevel', () => {
  it('has the 6 levels of the spec', () => {
    expect(LEVELS.map(l => l.name)).toEqual(['Calouro', 'Aprendiz', 'Cinéfilo', 'Crítico', 'Maratonista', 'Lenda']);
  });

  it('computes progress towards the next level', () => {
    expect(getLevel(0)).toMatchObject({ name: 'Calouro', percent: 0, missing: 100 });
    expect(getLevel(50)).toMatchObject({ name: 'Calouro', percent: 50 });
    expect(getLevel(100)).toMatchObject({ name: 'Aprendiz', percent: 0 });
  });

  it('stops at the last level', () => {
    expect(getLevel(99999)).toMatchObject({ name: 'Lenda', next: null, percent: 100, missing: 0 });
  });
});

describe('normalizeProgress', () => {
  it('survives corrupted data', () => {
    expect(normalizeProgress('x')).toEqual(EMPTY_PROGRESS);
    expect(normalizeProgress({ xp: -5, streak: 1.5, log: 'y', lastVisit: 3 })).toEqual(EMPTY_PROGRESS);
    expect(normalizeProgress({ social: { friends: -1, matches: 'x', outro: 9 } }).social).toEqual(EMPTY_PROGRESS.social);
  });

  it('keeps social counters and fills the missing ones (old saved progress)', () => {
    expect(normalizeProgress({ xp: 10 }).social).toEqual({ friends: 0, sharesSent: 0, ticketsShared: 0, matches: 0 });
    expect(normalizeProgress({ social: { matches: 3 } }).social.matches).toBe(3);
  });
});

describe('bumpSocial', () => {
  it('adds one without a value', () => {
    const once = bumpSocial(EMPTY_PROGRESS, 'sharesSent');
    expect(once.social.sharesSent).toBe(1);
    expect(bumpSocial(once, 'sharesSent').social.sharesSent).toBe(2);
    expect(EMPTY_PROGRESS.social.sharesSent).toBe(0);
  });

  it('keeps the highest friend count, so unfriending does not take it back', () => {
    const three = bumpSocial(EMPTY_PROGRESS, 'friends', 3);
    expect(three.social.friends).toBe(3);
    expect(bumpSocial(three, 'friends', 1)).toBe(null);
    expect(bumpSocial(three, 'friends', 3)).toBe(null);
    expect(bumpSocial(three, 'friends', 4).social.friends).toBe(4);
  });

  it('ignores unknown keys and bad values', () => {
    expect(bumpSocial(EMPTY_PROGRESS, 'likes')).toBe(null);
    expect(bumpSocial(EMPTY_PROGRESS, 'friends', -2)).toBe(null);
    expect(bumpSocial(EMPTY_PROGRESS, 'friends', 1.5)).toBe(null);
  });

  it('works on progress saved before the social counters existed', () => {
    const old = { xp: 0, streak: 0, bestStreak: 0, lastVisit: null, log: [] };
    expect(bumpSocial(old, 'matches').social).toEqual({ friends: 0, sharesSent: 0, ticketsShared: 0, matches: 1 });
  });
});

describe('localDay', () => {
  it('uses the local calendar', () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
