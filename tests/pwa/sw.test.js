import { expect, test } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { buildServiceWorker, readText } from '../../scripts/sw-assets.mjs';

test('sw.js lista todos os arquivos do app e a versão do conteúdo atual (rode npm run sw:assets)', () => {
  const current = readText(fileURLToPath(new URL('../../sw.js', import.meta.url)));
  expect(current).toBe(buildServiceWorker(current));
});
