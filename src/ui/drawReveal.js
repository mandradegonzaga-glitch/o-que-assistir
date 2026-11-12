// Etapa 5b do redesign: o sorteio vira um baralho de ingressos (decisão do usuário, 2026-11-08).
// Enquanto a busca acontece, 3 ingressos com o verso da marca embaralham (o de baixo sai pela lateral
// e cai por cima, um de cada vez); quando o título chega,
// o de cima vira e mostra o pôster (vibração curta no celular), e a página do título sobe por cima.
// Ref.: "Cast Iron Card Back Shuffle" (Jake O'Connell) e "Movie Picker" (10Clouds), no Dribbble.
// Tempos pela skill emil-design-eng: embaralhar no mínimo 0,9 s (uma volta: os 3 ingressos passam por cima),
// virar 450 ms (algo que já está na tela e muda: curva de entrada e saída), pausa de 250 ms para ler,
// e o palco some em 200 ms enquanto a gaveta do título sobe.
// Com "reduzir movimento", nada disso: o título abre direto, como antes.
import { getTitle, tmdbImage } from '../domain/mediaItem.js';
import { afterAnimations, prefersReducedMotion } from './motion.js';
import { ticketIcon } from './icons.js';

// Virar e sumir duram o que o CSS manda (afterAnimations); aqui só o que não é animação
const DRAW_TIMING = { shuffleMin: 900, hold: 250, posterWait: 1500 };

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Verso do ingresso: o bilhete da marca, grande, e o letreiro (também na abertura do app, src/app/splash.js)
export const TICKET_BACK = `
  <span class="draw-ticket__back" aria-hidden="true">
    ${ticketIcon('draw-ticket__logo')}
    <span class="draw-ticket__brand">O que<br>assistir?</span>
    <span class="draw-ticket__stub">Admite um</span>
  </span>`;

function ensureStage() {
  let stage = document.getElementById('draw-stage');
  if (stage) return stage;
  stage = document.createElement('div');
  stage.id = 'draw-stage';
  stage.className = 'draw-stage';
  stage.hidden = true;
  stage.innerHTML = `
    <div class="draw-deck">
      <div class="draw-ticket">${TICKET_BACK}</div>
      <div class="draw-ticket">${TICKET_BACK}</div>
      <div class="draw-ticket draw-ticket--top">
        <div class="draw-ticket__flip">
          ${TICKET_BACK}
          <span class="draw-ticket__front"><img class="draw-ticket__poster" alt=""></span>
        </div>
      </div>
    </div>
    <p class="draw-stage__caption" role="status" aria-live="polite"></p>`;
  document.body.appendChild(stage);
  return stage;
}

function preload(url) {
  if (!url) return Promise.resolve();
  const img = new Image();
  img.src = url;
  return (img.decode ? img.decode() : new Promise(r => { img.onload = img.onerror = r; })).catch(() => {});
}

function hideStage(stage) {
  stage.hidden = true;
  stage.classList.remove('is-revealed', 'is-leaving');
}

// pick(): busca e devolve o título sorteado (ou null se não achou nada; quem chama avisa).
// Devolve o título depois da revelação; chame endDrawReveal() quando a página dele já estiver abrindo.
export async function drawReveal(pick) {
  if (prefersReducedMotion()) return pick();

  const stage = ensureStage();
  const caption = stage.querySelector('.draw-stage__caption');
  const poster = stage.querySelector('.draw-ticket__poster');
  poster.removeAttribute('src');
  caption.textContent = 'Sorteando…';
  stage.classList.remove('is-revealed', 'is-leaving');
  stage.hidden = false;
  const started = performance.now();

  let item;
  try {
    item = await pick();
  } catch (e) {
    hideStage(stage);
    throw e;
  }
  if (!item) {
    hideStage(stage);
    return null;
  }

  const url = tmdbImage(item.poster_path);
  await Promise.race([preload(url), wait(DRAW_TIMING.posterWait)]);
  await wait(Math.max(0, DRAW_TIMING.shuffleMin - (performance.now() - started)));

  if (url) poster.src = url;
  caption.textContent = getTitle(item);
  stage.classList.add('is-revealed');
  navigator.vibrate?.(15);
  await afterAnimations(stage);
  await wait(DRAW_TIMING.hold);
  return item;
}

// O palco some enquanto a página do título sobe por baixo dele
export function endDrawReveal() {
  const stage = document.getElementById('draw-stage');
  if (!stage || stage.hidden) return;
  stage.classList.add('is-leaving');
  afterAnimations(stage).then(() => hideStage(stage));
}
