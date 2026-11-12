import { describe, it, expect } from '@jest/globals';
import { cardDragPose, cardSwipeVote, isHorizontalSwipe, sheetDragOffset, shouldDismissSheet } from '../../src/domain/gestures.js';

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


// Match de arrastar (repasse da etapa 5): vota por distância OU por arremesso, só na horizontal
describe('cardSwipeVote', () => {
  const width = 300;
  it('passing 35% of the width votes, to each side', () => {
    expect(cardSwipeVote({ dx: 120, dy: 10, velocity: 0, width })).toBe(true);
    expect(cardSwipeVote({ dx: -120, dy: 10, velocity: 0, width })).toBe(false);
  });

  it('a short drag goes back', () => {
    expect(cardSwipeVote({ dx: 60, dy: 0, velocity: 0.1, width })).toBeNull();
  });

  it('a quick flick votes even when short, but not a jitter or a flick the other way', () => {
    expect(cardSwipeVote({ dx: 50, dy: 0, velocity: 0.9, width })).toBe(true);
    expect(cardSwipeVote({ dx: 8, dy: 0, velocity: 0.9, width })).toBeNull();
    expect(cardSwipeVote({ dx: 50, dy: 0, velocity: -0.9, width })).toBeNull();
  });

  it('a mostly vertical gesture never votes', () => {
    expect(cardSwipeVote({ dx: 130, dy: 200, velocity: 0, width })).toBeNull();
  });
});

describe('cardDragPose', () => {
  it('rests flat with no stamp', () => {
    expect(cardDragPose(0, 300)).toEqual({ rotate: 0, yes: 0, no: 0 });
  });

  it('tilts toward the side and lights only that stamp, full at the vote limit', () => {
    expect(cardDragPose(105, 300)).toEqual({ rotate: 12, yes: 1, no: 0 });
    const left = cardDragPose(-52.5, 300);
    expect(left.rotate).toBeCloseTo(-6);
    expect(left).toMatchObject({ yes: 0, no: 0.5 });
  });

  it('does not tilt past the limit', () => {
    expect(cardDragPose(900, 300).rotate).toBe(12);
  });
});
