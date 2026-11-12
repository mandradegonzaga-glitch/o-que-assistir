// Abertura do app (volta à etapa 1 do repasse com o clleancode, 2026-11-11): uma pilha de cartões —
// o verso do ingresso da marca, com o pôster por cima quando há títulos guardados no aparelho — e,
// um de cada vez, os de cima são arremessados para o alto; depois a tela sobe e o app aparece.
// Ref.: o carregamento de partner.clleancode.com (fotos que sobem girando ~10° e encolhendo).
// Uma vez por sessão, ~1,4 s, e tocar pula. Com "reduzir movimento", não aparece (o CSS já esconde).
// O movimento inteiro mora no CSS (atrasos por cartão); aqui só montar a pilha e tirar a tela no fim.
import { tmdbImage } from '../domain/mediaItem.js';
import { TICKET_BACK } from '../ui/drawReveal.js';
import { prefersReducedMotion } from '../ui/motion.js';
import { getGuestData } from './guestLibrary.js';

const SEEN = 'splash_seen'; // na sessão: recarregar a página não repete a abertura
const CARDS = 4;

const seen = () => { try { return sessionStorage.getItem(SEEN) === '1'; } catch { return true; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN, '1'); } catch { /* sem sessionStorage: segue */ } };

// Pôsteres do que a pessoa guardou neste aparelho (os mais recentes); sem nenhum, só os ingressos
function devicePosters() {
  const { watchlist, history } = getGuestData();
  return [...watchlist, ...history].map(i => i.poster).filter(Boolean).slice(0, CARDS);
}

function cardHtml(poster, index) {
  const img = poster ? `<img class="splash__poster" src="${tmdbImage(poster, 'w342')}" alt="">` : '';
  return `<span class="splash__card" style="--i:${index}">${TICKET_BACK}${img}</span>`;
}

export function playSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  if (seen() || prefersReducedMotion()) {
    splash.remove();
    return;
  }
  markSeen();
  const posters = devicePosters();
  // O primeiro do HTML fica por baixo (é o que sobra); os de cima saem primeiro
  splash.querySelector('.splash__stack').innerHTML =
    Array.from({ length: CARDS }, (_, i) => cardHtml(posters[CARDS - 1 - i], i)).join('');
  // O pôster só aparece quando carrega; se não chegar a tempo (ou falhar), fica o ingresso
  splash.querySelectorAll('.splash__poster').forEach(img => img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true }));
  splash.classList.add('is-playing');
  splash.addEventListener('pointerdown', () => splash.classList.add('is-skipping'), { once: true });
  splash.addEventListener('animationend', e => { if (e.animationName === 'splash-lift') splash.remove(); });
}
