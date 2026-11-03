import { describe, it, expect } from '@jest/globals';
import { addMatchEntry, formatMatchDate, HISTORY_SIZE, normalizeMatchHistory, removeMatchEntry } from '../../src/domain/matchHistory.js';

const entry = (overrides = {}) => ({ at: '2026-11-03T20:00:00.000Z', with: 'Bia', type: 'movie', ids: [603], ...overrides });

describe('addMatchEntry', () => {
  it('põe o mais recente primeiro', () => {
    const list = addMatchEntry(addMatchEntry([], entry({ ids: [1] })), entry({ ids: [2], at: '2026-11-04T10:00:00.000Z' }));
    expect(list.map(e => e.ids[0])).toEqual([2, 1]);
  });

  it('a mesma partida no mesmo dia não duplica, mesmo com ids em outra ordem', () => {
    const once = addMatchEntry([], entry({ ids: [1, 2] }));
    const again = addMatchEntry(once, entry({ ids: [2, 1], at: '2026-11-03T21:00:00.000Z' }));
    expect(again).toHaveLength(1);
    expect(again[0].at).toBe('2026-11-03T21:00:00.000Z');
  });

  it('outra pessoa, outro dia ou outros títulos é outra linha', () => {
    let list = addMatchEntry([], entry());
    list = addMatchEntry(list, entry({ with: 'Cau' }));
    list = addMatchEntry(list, entry({ at: '2026-11-05T20:00:00.000Z' }));
    list = addMatchEntry(list, entry({ ids: [604] }));
    expect(list).toHaveLength(4);
  });

  it('guarda no máximo HISTORY_SIZE partidas', () => {
    let list = [];
    for (let i = 1; i <= HISTORY_SIZE + 3; i++) list = addMatchEntry(list, entry({ ids: [i] }));
    expect(list).toHaveLength(HISTORY_SIZE);
    expect(list[0].ids).toEqual([HISTORY_SIZE + 3]);
  });

  it('ignora entrada inválida', () => {
    const list = [entry()];
    expect(addMatchEntry(list, entry({ ids: [] }))).toBe(list);
    expect(addMatchEntry(list, entry({ type: 'anime' }))).toBe(list);
    expect(addMatchEntry(list, entry({ with: '  ' }))).toBe(list);
    expect(addMatchEntry(list, entry({ at: 'ontem' }))).toBe(list);
  });
});

describe('normalizeMatchHistory', () => {
  it('sobrevive a dados corrompidos', () => {
    expect(normalizeMatchHistory('x')).toEqual([]);
    expect(normalizeMatchHistory([null, entry({ ids: [-1] }), entry()])).toEqual([entry()]);
  });

  it('tira ids repetidos', () => {
    expect(normalizeMatchHistory([entry({ ids: [1, 1, 2] })])[0].ids).toEqual([1, 2]);
  });
});

describe('removeMatchEntry e formatMatchDate', () => {
  it('remove pela data da partida', () => {
    expect(removeMatchEntry([entry(), entry({ at: '2026-11-04T10:00:00.000Z' })], '2026-11-03T20:00:00.000Z')).toHaveLength(1);
  });

  it('data curta em português', () => {
    expect(formatMatchDate('2026-11-03T12:00:00.000Z')).toMatch(/^3 de nov\.?$/);
  });
});
