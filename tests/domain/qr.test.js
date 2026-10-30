import { describe, it, expect } from '@jest/globals';
import jsQR from 'jsqr';
import { buildQrMatrix } from '../../src/domain/qr.js';

// Rasteriza a matriz e lê de volta com um decodificador independente
function decode(matrix, scale = 6, quiet = 4) {
  const side = (matrix.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (!dark) return;
    for (let py = 0; py < scale; py++) {
      for (let px = 0; px < scale; px++) {
        const i = (((y + quiet) * scale + py) * side + (x + quiet) * scale + px) * 4;
        data[i] = data[i + 1] = data[i + 2] = 0;
      }
    }
  }));
  return jsQR(data, side, side)?.data;
}

describe('buildQrMatrix', () => {
  it.each([
    'https://o-que-assistir-watch.vercel.app/?titulo=movie-603',
    'https://o-que-assistir-watch.vercel.app/?titulo=dorama-123456',
    'http://localhost:5173/?titulo=tv-1396',
  ])('um leitor independente lê %s', url => {
    expect(decode(buildQrMatrix(url))).toBe(url);
  });

  it('is square', () => {
    const matrix = buildQrMatrix('abc');
    matrix.forEach(row => expect(row).toHaveLength(matrix.length));
  });
});
