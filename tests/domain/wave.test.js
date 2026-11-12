import { describe, it, expect } from '@jest/globals';
import { waveCells, WAVE_SPREAD_S } from '../../src/domain/wave.js';

// Onda de pontos do "Deu Match!" (efeito do clleancode)
describe('waveCells', () => {
  it('has one cell per grid position', () => {
    expect(waveCells(7, 5)).toHaveLength(35);
  });

  it('starts at the centre: no delay and the smallest start there, corners last and biggest', () => {
    const cells = waveCells(5, 3);
    const centre = cells[1 * 5 + 2];
    expect(centre).toEqual({ delay: 0, from: 0.55 });
    expect(cells[0]).toEqual({ delay: WAVE_SPREAD_S, from: 0.9 });
    expect(cells.at(-1)).toEqual(cells[0]);
  });

  it('delay grows with the distance', () => {
    const row = waveCells(7, 1).map(c => c.delay);
    expect(row.slice(3)).toEqual([...row.slice(3)].sort((a, b) => a - b));
    expect(row[0]).toBe(row[6]);
  });
});
