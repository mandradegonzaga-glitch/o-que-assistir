import { describe, it, expect } from '@jest/globals';
import { scorePassword } from '../../src/domain/passwordStrength.js';

describe('scorePassword', () => {
  it('empty string returns score 0 and level weak', () => {
    expect(scorePassword('')).toEqual({ score: 0, level: 'weak' });
  });

  it('null/undefined returns score 0', () => {
    expect(scorePassword(null)).toEqual({ score: 0, level: 'weak' });
    expect(scorePassword(undefined)).toEqual({ score: 0, level: 'weak' });
  });

  it('3-char password stays at score 0', () => {
    expect(scorePassword('abc').score).toBe(0);
  });

  it('4-char password earns score 1', () => {
    expect(scorePassword('abcd').score).toBe(1);
  });

  it('8+ char lowercase-only earns score 2 (length bonuses only)', () => {
    expect(scorePassword('abcdefgh').score).toBe(2);
  });

  it('mixed case 8+ chars earns +1 for case', () => {
    expect(scorePassword('Abcdefgh').score).toBe(3);
  });

  it('mixed case + digit earns score 4', () => {
    expect(scorePassword('Abcdefg1').score).toBe(4);
  });

  it('all criteria met earns score 5', () => {
    expect(scorePassword('Abcdef1!').score).toBe(5);
  });

  it('score <= 2 => level weak', () => {
    expect(scorePassword('abcd').level).toBe('weak');
    expect(scorePassword('abcdefgh').level).toBe('weak');
  });

  it('score 3 => level medium', () => {
    expect(scorePassword('Abcdefgh').level).toBe('medium');
  });

  it('score >= 4 => level strong', () => {
    expect(scorePassword('Abcdefg1').level).toBe('strong');
    expect(scorePassword('Abcdef1!').level).toBe('strong');
  });
});
