import { expect, test } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// O HTML e os templates chamam ações pelo nome (data-action, data-input, data-change, data-enter);
// cada parte do app as registra com registerActions. Um nome trocado de um lado não daria erro nenhum.
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const KINDS = { action: 'click', input: 'input', change: 'change', enter: 'enter' };

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'vendor' ? [] : sources(path);
    return path.endsWith('.js') ? [readFileSync(path, 'utf8')] : [];
  });
}

function registered(code) {
  const names = { click: new Set(), input: new Set(), change: new Set(), enter: new Set() };
  for (const [, body] of code.matchAll(/registerActions\(\{([\s\S]*?)\n\}\);/g)) {
    for (const [, kind, entries] of body.matchAll(/^\s+(click|input|change|enter): \{([\s\S]*?)^\s{2,4}\},/gm)) {
      for (const [, name] of entries.matchAll(/^\s{4,8}([\w$]+)(?=[:,])/gm)) names[kind].add(name);
    }
  }
  return names;
}

function used(text) {
  return Object.entries(KINDS).flatMap(([attr, kind]) =>
    [...text.matchAll(new RegExp(`data-${attr}="([\\w$]+)"`, 'g'))].map(m => ({ kind, name: m[1] })));
}

test('toda ação usada no HTML e nos templates está registrada', () => {
  const code = sources(join(ROOT, 'src')).join('\n');
  const names = registered(code);
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const missing = used(html + code).filter(({ kind, name }) => !names[kind].has(name));
  expect(missing).toEqual([]);
  expect(names.click.size).toBeGreaterThan(100); // a leitura dos registros funcionou
});
