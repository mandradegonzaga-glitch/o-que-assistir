import { describe, it, expect } from '@jest/globals';
import { computeSpinRotation, sliceAtPointer } from '../../src/domain/roulette.js';

describe('computeSpinRotation', () => {
  it('stops on the winner for every wheel size, slice and spin count', () => {
    for (let count = 2; count <= 12; count++) {
      for (let winner = 0; winner < count; winner++) {
        for (const spins of [5, 5.37, 6.5, 7.99]) {
          expect(sliceAtPointer(computeSpinRotation(winner, count, spins), count)).toBe(winner);
        }
      }
    }
  });

  it('lands on the center of the slice, away from the edges', () => {
    expect(computeSpinRotation(0, 2, 5)).toBe(5 * 360 - 90);
    expect(computeSpinRotation(1, 4, 6)).toBe(6 * 360 - 135);
  });

  it('always spins forward by at least the requested whole turns minus one', () => {
    expect(computeSpinRotation(3, 4, 5)).toBeGreaterThan(4 * 360);
  });
});
