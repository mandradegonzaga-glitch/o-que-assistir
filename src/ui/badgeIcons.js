// Ícones das conquistas (a regra de cada uma fica em src/domain/badges.js).
// Phosphor duotone, a mesma família dos ícones de destaque do app (src/ui/phosphor.js).
import { ph } from './phosphor.js';
import { formatCount } from '../utils/format.js';

const ICON_OF = {
  friends: 'users-three',      // duas ou mais pessoas
  send: 'paper-plane-tilt',    // avião de papel
  ticket: 'ticket',            // ingresso
  popcorn: 'popcorn',          // balde de pipoca
  film: 'film-slate',          // claquete
  monocle: 'magnifying-glass', // lupa
  tv: 'television',            // TV
  ghost: 'ghost',              // fantasma
  laugh: 'mask-happy',         // máscara da comédia
  heart: 'heart',              // coração
  alien: 'alien',              // alien
  bolt: 'lightning',           // raio
  roulette: 'dice-five',       // dado na face 5: as cinco vitórias da conquista
  vhs: 'cassette-tape',        // fita
  trophy: 'trophy',            // troféu
  sakura: 'flower',            // flor (doramas)
  sparkles: 'sparkle',         // brilhos da animação
  camera: 'video-camera',      // câmera de documentário
  detective: 'detective',      // detetive
  flame: 'fire',               // chama da sequência
  moon: 'moon-stars',          // lua com estrelas
};

export const BADGE_ICONS = Object.fromEntries(Object.entries(ICON_OF).map(([key, name]) => [key, ph(name, { weight: 'duotone' })]));

// O cartão de uma conquista (perfil e perfil do amigo).
//   status: o leitor de tela ouve se está desbloqueada (no perfil, onde há das duas)
//   progress: { current, goal } de uma bloqueada com meta maior que 1 ("4 de 10" e barrinha)
export function badgeCard(badge, { unlocked = true, status = false, progress = null } = {}) {
  const card = document.createElement('div');
  card.className = unlocked ? 'badge-item unlocked' : 'badge-item';
  card.dataset.color = badge.color;
  card.innerHTML = `<div class="badge-icon">${BADGE_ICONS[badge.icon]}</div><div class="badge-info"><h4></h4><p></p></div>`;
  const title = card.querySelector('h4');
  title.textContent = badge.name;
  if (status) title.insertAdjacentHTML('beforeend', `<span class="sr-only">, ${unlocked ? 'desbloqueada' : 'bloqueada'}</span>`);
  card.querySelector('p').textContent = badge.desc;
  if (progress) {
    const { current, goal } = progress;
    card.querySelector('.badge-info').insertAdjacentHTML('beforeend', `
      <p class="badge-count">${formatCount(current)} de ${formatCount(goal)}</p>
      <div class="badge-meter" aria-hidden="true"><div class="badge-meter__fill" style="width: ${(current / goal) * 100}%"></div></div>`);
  }
  return card;
}
