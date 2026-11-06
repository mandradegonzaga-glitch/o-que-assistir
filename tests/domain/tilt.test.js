import { describe, it, expect } from '@jest/globals';
import { tiltFor } from '../../src/ui/tilt.js';

const rect = { left: 100, top: 200, width: 200, height: 300 };

describe('tiltFor', () => {
  it('is flat in the middle', () => {
    expect(tiltFor(rect, 200, 350)).toEqual({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  });

  it('leans toward the corner the mouse is on, up to the limit', () => {
    expect(tiltFor(rect, 300, 200)).toEqual({ rotateX: 8, rotateY: 8, glareX: 100, glareY: 0 });
    expect(tiltFor(rect, 100, 500)).toEqual({ rotateX: -8, rotateY: -8, glareX: 0, glareY: 100 });
  });

  it('never passes the limit, even outside the poster', () => {
    expect(tiltFor(rect, 9999, -9999)).toEqual({ rotateX: 8, rotateY: 8, glareX: 100, glareY: 0 });
  });
});
