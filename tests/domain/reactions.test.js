import { readFileSync } from 'node:fs';
import { describe, it, expect } from '@jest/globals';
import { REACTIONS, nextReaction, reactionOf } from '../../src/domain/reactions.js';

describe('reactions', () => {
  // Repasse da etapa 5e: 6 reações (duas negativas, pedido do usuário), em selos ilustrados
  it('has the six reactions, in order', () => {
    expect(REACTIONS.map(r => r.id)).toEqual(['fire', 'sad', 'laugh', 'mind', 'dislike', 'sleep']);
    expect(reactionOf('dislike')).toMatchObject({ label: 'Não curti' });
    expect(reactionOf('sleep')).toMatchObject({ label: 'Dormi no meio' });
    expect(reactionOf('love')).toBeNull();
    expect(reactionOf(null)).toBeNull();
  });

  it('the database accepts exactly the same ids', () => {
    const sql = readFileSync(new URL('../../database/reactions.sql', import.meta.url), 'utf8');
    const check = sql.match(/CHECK \(reaction IN \(([^)]*)\)\)/)[1];
    expect(check.match(/'([a-z]+)'/g).map(s => s.slice(1, -1))).toEqual(REACTIONS.map(r => r.id));
  });

  it('sets, switches and clears', () => {
    expect(nextReaction(null, 'fire')).toBe('fire');
    expect(nextReaction('fire', 'sleep')).toBe('sleep');
    expect(nextReaction('sad', 'sad')).toBeNull();
    expect(nextReaction('fire', 'love')).toBe('fire');
    expect(nextReaction(undefined, 'love')).toBeNull();
  });
});
