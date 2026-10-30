import { describe, it, expect } from '@jest/globals';
import { isHorizontalSwipe } from '../../src/domain/gestures.js';

describe('isHorizontalSwipe', () => {
  it('accepts a long horizontal gesture in either direction', () => {
    expect(isHorizontalSwipe(150, 10)).toBe(true);
    expect(isHorizontalSwipe(-150, 10)).toBe(true);
  });

  it('rejects short gestures', () => {
    expect(isHorizontalSwipe(100, 0)).toBe(false);
  });

  it('rejects vertical and diagonal scrolling', () => {
    expect(isHorizontalSwipe(120, 300)).toBe(false);
    expect(isHorizontalSwipe(150, 100)).toBe(false);
  });
});
