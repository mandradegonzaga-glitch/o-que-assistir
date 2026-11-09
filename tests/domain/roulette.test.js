import { describe, it, expect } from '@jest/globals';
import { computeSpinRotation } from '../../src/domain/roulette.js';

// Conferência independente: qual fatia fica sob o ponteiro (no topo) depois de girar `rotation` graus,
// com a primeira fatia começando no topo e as seguintes em sentido horário
function sliceAtPointer(rotation, itemCount) {
  const angleAtPointer = ((-rotation % 360) + 360) % 360;
  return Math.floor(angleAtPointer / (360 / itemCount));
}

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
