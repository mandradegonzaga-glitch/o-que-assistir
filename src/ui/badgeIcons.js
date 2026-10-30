// Ícones das conquistas (a regra de cada uma fica em src/domain/badges.js).
// Mesma família dos ícones de tipo: contorno arredondado + preenchimento suave na forma principal.
const svg = inner => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const TONE = 'fill="currentColor" fill-opacity="0.2"';
const SOLID = 'fill="currentColor" stroke="none"';

export const BADGE_ICONS = {
  // Balde de pipoca
  popcorn: svg(`<path ${TONE} d="M6 10h12l-1.5 11h-9z"/><path d="M10 10l.7 11M14 10l-.7 11"/><path d="M6 10a2.5 2.5 0 0 1 1-4.8 3 3 0 0 1 5-1.7 3 3 0 0 1 5 1.7 2.5 2.5 0 0 1 1 4.8"/>`),
  // Claquete
  film: svg(`<rect ${TONE} x="3" y="10" width="18" height="11" rx="1.5"/><path d="M3.2 10 2.5 6.8 19.8 3l.7 3.2z"/><path d="M7.4 5.8l1.9 3M12.4 4.7l1.9 3"/>`),
  // Lupa sobre uma estrela
  monocle: svg(`<circle ${TONE} cx="10.5" cy="10.5" r="7"/><path d="M15.6 15.6 21 21"/><path ${SOLID} d="M10.5 6.8l1.1 2.3 2.5.3-1.9 1.7.5 2.5-2.2-1.3-2.2 1.3.5-2.5-1.9-1.7 2.5-.3z"/>`),
  // TV com play
  tv: svg(`<rect ${TONE} x="3" y="7" width="18" height="13" rx="2"/><path d="M8 3l4 4 4-4"/><path ${SOLID} d="M10 10.5v6l5-3z"/>`),
  // Fantasma
  ghost: svg(`<path ${TONE} d="M12 3a7 7 0 0 0-7 7v11l2.4-2 2.3 2 2.3-2 2.3 2 2.3-2 2.4 2V10a7 7 0 0 0-7-7z"/><circle ${SOLID} cx="9.5" cy="10.5" r="1.3"/><circle ${SOLID} cx="14.5" cy="10.5" r="1.3"/>`),
  // Máscara da comédia
  laugh: svg(`<path ${TONE} d="M5 4c4 1.5 10 1.5 14 0 .8 6 .5 16-7 17C4.5 20 4.2 10 5 4z"/><path d="M7.8 10.2c.7-1 1.9-1 2.6 0M13.6 10.2c.7-1 1.9-1 2.6 0"/><path ${SOLID} d="M8 13.5c2.2 1.1 5.8 1.1 8 0-.4 3-2 4.5-4 4.5s-3.6-1.5-4-4.5z"/>`),
  // Coração com flecha
  heart: svg(`<path ${TONE} d="M12 20.5s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10.2-7.5 10.2z"/><path d="M3 20 21 4M21 4h-3.4M21 4v3.4"/>`),
  // Cabeça de alien
  alien: svg(`<path ${TONE} d="M12 3c-4.6 0-7.5 3.2-7.5 7.2 0 4.6 4.4 10.8 7.5 10.8s7.5-6.2 7.5-10.8C19.5 6.2 16.6 3 12 3z"/><path ${SOLID} d="M7.3 10.2c2 0 3.5 1.3 3.8 3.4-2 0-3.5-1.3-3.8-3.4zM16.7 10.2c-2 0-3.5 1.3-3.8 3.4 2 0 3.5-1.3 3.8-3.4z"/>`),
  // Raio
  bolt: svg(`<path ${TONE} d="M13.5 2 4.5 13.5H11L10 22l9.5-12.5H13z"/>`),
  // Dado na face 5: as cinco vitórias da conquista
  roulette: svg(`<rect ${TONE} x="3.5" y="3.5" width="17" height="17" rx="3.5"/><circle ${SOLID} cx="8.2" cy="8.2" r="1.4"/><circle ${SOLID} cx="15.8" cy="8.2" r="1.4"/><circle ${SOLID} cx="12" cy="12" r="1.4"/><circle ${SOLID} cx="8.2" cy="15.8" r="1.4"/><circle ${SOLID} cx="15.8" cy="15.8" r="1.4"/>`),
  // Fita VHS
  vhs: svg(`<rect ${TONE} x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="8" cy="12" r="2.4"/><circle cx="16" cy="12" r="2.4"/><path d="M8 14.4h8"/>`),
  // Lua com estrelas
  moon: svg(`<path ${TONE} d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="M17 3.5v3.4M15.3 5.2h3.4M20.8 9v1.8M19.9 9.9h1.8"/>`),
};
