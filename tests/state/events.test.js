import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { emit, on } from '../../src/state/events.js';

describe('emit / on', () => {
  it('uma escuta com erro não impede as outras nem quebra quem avisou', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const seen = [];
    on('teste:erro', () => { throw new Error('síncrono'); });
    on('teste:erro', async () => { throw new Error('assíncrono'); });
    on('teste:erro', detail => seen.push(detail.n));
    await expect(emit('teste:erro', { n: 1 })).resolves.toBeDefined();
    expect(seen).toEqual([1]);
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });

  it('await emit espera as escutas assíncronas terminarem', async () => {
    let done = false;
    on('teste:espera', async () => { await new Promise(r => setTimeout(r, 5)); done = true; });
    await emit('teste:espera');
    expect(done).toBe(true);
  });

  it('a função devolvida por on para de escutar', async () => {
    const seen = [];
    const stop = on('teste:parar', () => seen.push('x'));
    await emit('teste:parar');
    stop();
    await emit('teste:parar');
    expect(seen).toEqual(['x']);
  });
});

// Os nomes dos eventos são texto: um nome trocado de um lado não daria erro nenhum.
const SRC = fileURLToPath(new URL('../../src', import.meta.url));
function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'vendor' ? [] : sources(path);
    return path.endsWith('.js') ? [readFileSync(path, 'utf8')] : [];
  });
}
const names = (code, fn) => [...code.matchAll(new RegExp(`(?<![.\\w])${fn}\\(\\s*'([\\w:-]+)'`, 'g'))].map(m => m[1]);

it('todo evento escutado é avisado em algum lugar e está na lista de src/state/events.js', () => {
  const code = sources(SRC).join('\n');
  const emitted = new Set(names(code, 'emit'));
  const documented = readFileSync(join(SRC, 'state/events.js'), 'utf8');
  const listened = new Set(names(code, 'on'));
  expect(listened.size).toBeGreaterThan(5);
  for (const name of listened) {
    expect({ name, emitted: emitted.has(name) }).toEqual({ name, emitted: true });
    expect({ name, documented: documented.includes(`'${name}'`) }).toEqual({ name, documented: true });
  }
  for (const name of emitted) {
    expect({ name, documented: documented.includes(`'${name}'`) }).toEqual({ name, documented: true });
  }
});
