// Gera a lista de arquivos do cache offline e a versão do cache em sw.js.
// A versão é o hash do conteúdo: muda sozinha quando qualquer arquivo do app muda.
// Uso: npm run sw:assets  (o teste tests/pwa/sw.test.js falha se o sw.js estiver desatualizado)
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const EXTERNAL = [
  'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,400;0,500;0,700;1,400&family=Big+Shoulders+Display:wght@700;800;900&display=swap',
];

// Sem \r: o checkout no Windows (CRLF) e o do CI (LF) dão a mesma versão
export const readText = path => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function localAssets() {
  const files = walk(join(ROOT, 'src'))
    .filter(path => /\.(js|css)$/.test(path))
    .map(path => '/' + relative(ROOT, path).split(sep).join('/'))
    .sort();
  return ['/index.html', '/manifest.json', ...files];
}

export function buildServiceWorker(source = readText(join(ROOT, 'sw.js'))) {
  const local = localAssets();
  const hash = createHash('sha256');
  for (const asset of local) hash.update(asset).update(readText(join(ROOT, asset.slice(1))));
  const version = hash.digest('hex').slice(0, 10);
  const list = ["'/'", ...[...local, ...EXTERNAL].map(asset => `'${asset}'`)].map(line => `    ${line},`).join('\n');
  return source
    .replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${version}';`)
    .replace(/\/\/ <assets>[\s\S]*?\/\/ <\/assets>/, `// <assets>\n${list}\n    // </assets>`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(ROOT, 'sw.js'), buildServiceWorker());
  console.log('sw.js atualizado');
}
