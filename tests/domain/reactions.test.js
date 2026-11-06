import { describe, it, expect } from '@jest/globals';
import { REACTIONS, nextReaction, reactionOf } from '../../src/domain/reactions.js';

describe('reactions', () => {
  it('has the four reactions the database accepts', () => {
    expect(REACTIONS.map(r => r.id)).toEqual(['fire', 'sad', 'laugh', 'mind']);
    expect(reactionOf('sad')).toMatchObject({ emoji: '😢', label: 'Chorei' });
    expect(reactionOf('love')).toBeNull();
    expect(reactionOf(null)).toBeNull();
  });

  it('sets, switches and clears', () => {
    expect(nextReaction(null, 'fire')).toBe('fire');
    expect(nextReaction('fire', 'sad')).toBe('sad');
    expect(nextReaction('sad', 'sad')).toBeNull();
    expect(nextReaction('fire', 'love')).toBe('fire');
    expect(nextReaction(undefined, 'love')).toBeNull();
  });
});
