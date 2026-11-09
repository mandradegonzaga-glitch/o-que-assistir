// Ícones usados nos templates (decorativos: o nome acessível fica no botão)
// Todos do Phosphor (src/ui/phosphor.js), menos o ingresso, que é a marca do app
import { ph } from './phosphor.js';
import { tmdbImage } from '../domain/mediaItem.js';
export const CLOSE_ICON = ph('x', { weight: 'bold', cls: 'icon-x' });
export const TV_ICON = ph('television', { weight: 'duotone', cls: 'icon-24' });
export const WHEEL_ICON = ph('roulette', { weight: 'duotone', cls: 'icon-40' });
export const TICKET_ICON = '<svg aria-hidden="true" class="icon-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" fill-opacity="0.2" d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2.5a1.5 1.5 0 0 0 0-3z"/><path d="M16 6v2M16 11v2M16 16v2"/><path fill="currentColor" stroke="none" d="M8 9v6l5-3z"/></svg>';
export const STAR_ICON = ph('star', { weight: 'duotone', cls: 'icon-40' });

// Foto de pessoa (elenco, sugestão de ator). Sem foto, um desenho local: nada de pedir a terceiros
const PERSON_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60"><rect width="60" height="60" fill="#1f1f1f"/><circle cx="30" cy="23" r="11" fill="#555"/><path d="M10 56c3-11 11-17 20-17s17 6 20 17" fill="#555"/></svg>');
export const personPhoto = path => tmdbImage(path) || PERSON_PLACEHOLDER;

// Pôster de título (proporção 2:3). Em texto (para templates) ou como elemento; sem pôster, src vazio
// e o CSS mostra o fundo do cartão.
export function posterImg(path, { cls = '', alt = '', lazy = true } = {}) {
  const attrs = [cls && `class="${cls}"`, `src="${tmdbImage(path)}"`, `alt="${alt}"`, 'width="500" height="750"', lazy && 'loading="lazy"'];
  return `<img ${attrs.filter(Boolean).join(' ')}>`;
}

export function posterEl(path, { cls = '', width = 500, height = 750, lazy = true } = {}) {
  const img = document.createElement('img');
  if (cls) img.className = cls;
  img.alt = '';
  img.width = width;
  img.height = height;
  if (lazy) img.loading = 'lazy';
  if (path) img.src = tmdbImage(path);
  return img;
}
