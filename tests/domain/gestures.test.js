import { describe, it, expect } from '@jest/globals';
import { isHorizontalSwipe, sheetDragOffset, shouldDismissSheet } from '../../src/domain/gestures.js';

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

describe('shouldDismissSheet', () => {
  it('fecha quando passa de 30% da altura, mesmo devagar', () => {
    expect(shouldDismissSheet({ distance: 181, height: 600, velocity: 0 })).toBe(true);
    expect(shouldDismissSheet({ distance: 179, height: 600, velocity: 0 })).toBe(false);
  });
  it('fecha com um peteleco rápido, mesmo curto', () => {
    expect(shouldDismissSheet({ distance: 40, height: 600, velocity: 0.8 })).toBe(true);
  });
  it('não fecha arrastando para cima, por mais rápido que seja', () => {
    expect(shouldDismissSheet({ distance: -10, height: 600, velocity: 2 })).toBe(false);
    expect(shouldDismissSheet({ distance: 0, height: 600, velocity: 2 })).toBe(false);
  });
});

describe('sheetDragOffset', () => {
  it('para baixo acompanha o dedo 1:1', () => {
    expect(sheetDragOffset(120)).toBe(120);
  });
  it('para cima resiste (só 15% do movimento)', () => {
    expect(sheetDragOffset(-100)).toBeCloseTo(-15);
  });
});

