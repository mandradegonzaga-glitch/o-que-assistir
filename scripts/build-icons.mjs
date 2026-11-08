// Gera src/ui/phosphor.js só com os ícones que o app usa.
// Fonte: Phosphor Icons (MIT, @phosphor-icons/core) + desenhos próprios no mesmo padrão em scripts/icons-custom/
// (grade de 256, traço 16 no regular e 24 no bold, pontas arredondadas, preenchimento 0,2 no duotone).
// Uso: node scripts/build-icons.mjs   (rodar de novo ao acrescentar um nome em ICONS)
//
// Regra de peso no app:
//   duotone → ícones de destaque (tipos, modos, títulos de seção, telas vazias, boas-vindas, conquistas)
//   regular → interface (abas, botões, cabeçalho, rodapé)
//   bold    → interface pequena (16 px ou menos)
//   fill    → estado ativo / botão flutuante
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'node_modules', '@phosphor-icons', 'core', 'assets');
const CUSTOM = path.join(ROOT, 'scripts', 'icons-custom');

export const ICONS = {
  // ---- próprios ----
  roulette: ['regular', 'bold', 'duotone'],
  // ---- tipos e modos ----
  'film-slate': ['regular', 'duotone'], television: ['regular', 'duotone'], flower: ['duotone'],
  'dice-five': ['duotone'], 'eye-slash': ['duotone'], sword: ['duotone'], heart: ['regular', 'duotone', 'fill'],
  // ---- cabeçalho, abas e rodapé ----
  user: ['regular'], 'user-circle': ['duotone'], users: ['regular'], 'users-three': ['duotone'],
  question: ['regular'], 'magnifying-glass': ['regular', 'bold', 'duotone'], coffee: ['regular'],
  'chat-circle-text': ['regular'],
  // ---- barra de baixo (celular): traço normal, preenchido quando ativo ----
  house: ['regular', 'fill'],
  // ---- descobrir ----
  shuffle: ['bold'], 'circle-notch': ['bold'], fire: ['regular', 'duotone'], 'calendar-check': ['regular'],
  'clock-counter-clockwise': ['regular', 'duotone'], x: ['bold'], 'trend-up': ['duotone'],
  'sliders-horizontal': ['duotone'],
  // ---- biblioteca ----
  'bookmark-simple': ['regular', 'bold', 'duotone', 'fill'], 'play-circle': ['regular', 'duotone'],
  'check-circle': ['regular', 'duotone'], 'folder-simple': ['regular'], 'folder-open': ['duotone'], eye: ['regular'],
  // ---- roleta ----
  trash: ['regular'],
  // ---- título ----
  'caret-left': ['bold'], 'caret-right': ['bold'], 'caret-up': ['bold'], check: ['bold'], 'list-plus': ['regular'],
  ticket: ['regular', 'duotone'], 'share-network': ['regular'], prohibit: ['regular', 'duotone'], popcorn: ['duotone'],
  // ---- perfil ----
  trophy: ['duotone'], 'lock-key': ['regular', 'duotone'], 'floppy-disk': ['regular'], warning: ['duotone'],
  // ---- flutuantes, guia, instalar ----
  sparkle: ['duotone', 'fill'], star: ['fill', 'duotone'], dna: ['duotone'], 'device-mobile': ['duotone'], 'download-simple': ['regular'],
  'arrow-u-up-left': ['bold'], link: ['bold'], 'magic-wand': ['duotone'],
  // ---- listas (ícone escolhido pela pessoa) e coleções prontas ----
  ghost: ['duotone'], 'tree-evergreen': ['duotone'], smiley: ['duotone'], 'smiley-sad': ['duotone'],
  'smiley-nervous': ['duotone'], 'rocket-launch': ['duotone'], balloon: ['duotone'], moon: ['duotone'],
  books: ['regular', 'duotone', 'fill'], confetti: ['duotone'], skull: ['duotone'],
  // ---- conquistas ----
  'paper-plane-tilt': ['duotone'], 'mask-happy': ['duotone'], alien: ['duotone'], lightning: ['duotone'],
  'cassette-tape': ['duotone'], 'video-camera': ['duotone'], detective: ['duotone'], 'moon-stars': ['duotone'],
};

const fileOf = (name, w) => {
  const base = w === 'regular' ? `${name}.svg` : `${name}-${w}.svg`;
  const custom = path.join(CUSTOM, base);
  return fs.existsSync(custom) ? custom : path.join(ASSETS, w, base);
};
export const innerOf = (name, w) => fs.readFileSync(fileOf(name, w), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

function build() {
  const out = {};
  for (const [name, weights] of Object.entries(ICONS)) {
    for (const w of weights) out[`${name}:${w}`] = innerOf(name, w);
  }
  const body = `// GERADO por scripts/build-icons.mjs: não editar à mão.
// Ícones Phosphor (https://phosphoricons.com, licença MIT) + desenhos próprios no mesmo padrão.
const PATHS = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n  "').replace(/^\{/, '{\n  ').replace(/\}$/, ',\n}')};

// SVG decorativo (o nome acessível fica no botão ou no texto ao lado)
export function ph(name, { weight = 'duotone', cls = '' } = {}) {
  const d = PATHS[\`\${name}:\${weight}\`];
  if (!d) return '';
  return \`<svg class="ph\${cls ? \` \${cls}\` : ''}" aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor">\${d}</svg>\`;
}

// Preenche os <span data-ph="nome" data-weight="peso"> do HTML estático
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-ph]:not([data-ph-done])').forEach(el => {
    el.innerHTML = ph(el.dataset.ph, { weight: el.dataset.weight || 'duotone' });
    el.dataset.phDone = '';
  });
}
`;
  fs.writeFileSync(path.join(ROOT, 'src', 'ui', 'phosphor.js'), body);
  console.log(`src/ui/phosphor.js: ${Object.keys(out).length} ícones`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
