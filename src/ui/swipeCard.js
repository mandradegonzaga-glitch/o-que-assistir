// Cartão de arrastar do Match (repasse da etapa 5, skill gestures): enquanto o dedo está na tela o
// cartão É o dedo (1:1, sem transição), inclina para o lado e acende o carimbo daquele lado; ao soltar,
// vota por distância OU por arremesso (src/domain/gestures.js), senão volta com mola (CSS). Tocar sem
// arrastar vira o cartão. Os botões e as setas usam o mesmo voo de saída (flyOut).
import { cardDragPose, cardSwipeVote } from '../domain/gestures.js';
import { prefersReducedMotion } from './motion.js';

const TAP_PX = 6;
const STILL_MS = 100; // dedo parado antes de soltar: não houve arremesso
const FLY_MS = 280;
const ENTER_MS = 220;
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

function pose(card, dx) {
  const { rotate, yes, no } = cardDragPose(dx, card.offsetWidth);
  card.style.transform = `translateX(${dx}px) rotate(${rotate}deg)`;
  card.style.setProperty('--yes', yes);
  card.style.setProperty('--no', no);
}

function settle(card) {
  card.classList.remove('is-dragging');
  card.style.transform = '';
  card.style.removeProperty('--yes');
  card.style.removeProperty('--no');
}

export const isLeaving = card => card.classList.contains('is-leaving');

// Pegar o cartão durante a entrada: a entrada some e o cartão já é o dedo
const stopEntering = card => card.getAnimations()
  .filter(a => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation))
  .forEach(a => a.cancel());

export function bindSwipeCard(card, { onVote, onTap }) {
  let drag = null;

  card.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button') || isLeaving(card)) return;
    stopEntering(card);
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastT: e.timeStamp, velocity: 0, dx: 0, dy: 0 };
    card.setPointerCapture(e.pointerId);
    card.classList.add('is-dragging');
  });

  card.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.velocity = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    drag.dx = e.clientX - drag.x0;
    drag.dy = e.clientY - drag.y0;
    pose(card, drag.dx);
  });

  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, dy, lastT } = drag;
    const velocity = e.timeStamp - lastT > STILL_MS ? 0 : drag.velocity;
    drag = null;
    const tap = Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX;
    const vote = e.type === 'pointercancel' || tap ? null : cardSwipeVote({ dx, dy, velocity, width: card.offsetWidth });
    if (vote === null) {
      settle(card);
      if (tap && e.type !== 'pointercancel') onTap();
      return;
    }
    card.classList.remove('is-dragging');
    onVote(vote);
  };
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
}

// Sai voando para o lado do voto, a partir de onde o dedo deixou (ou do centro, nos botões), e fica
// parado lá fora até enterCard trazer o próximo título. Devolve { done, finish }: finish() encerra o voo
// na hora (outro voto chegou antes do fim; nenhum toque se perde).
export function flyOut(card, wanted) {
  card.classList.add('is-leaving');
  card.style.setProperty(wanted ? '--yes' : '--no', 1);
  if (prefersReducedMotion()) return { done: Promise.resolve(), finish() {} };
  const dir = wanted ? 1 : -1;
  const from = getComputedStyle(card).transform;
  const flight = card.animate([
    { transform: from === 'none' ? 'none' : from },
    { transform: `translateX(${dir * card.offsetWidth * 1.4}px) rotate(${dir * 18}deg)`, opacity: 0 },
  ], { duration: FLY_MS, easing: EASE_OUT, fill: 'forwards' });
  return { done: flight.finished, finish: () => flight.finish() };
}

// Título novo (ou o anterior, ao desfazer): limpa a saída e entra pequeno, de leve
export function enterCard(card) {
  card.getAnimations().forEach(a => a.cancel());
  card.classList.remove('is-leaving', 'is-flipped');
  settle(card);
  if (prefersReducedMotion()) return;
  card.animate([{ transform: 'scale(0.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: ENTER_MS, easing: EASE_OUT });
}
