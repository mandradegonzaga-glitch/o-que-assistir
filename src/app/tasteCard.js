// Cartão-ingresso "Seu gosto" no alto do DNA (repasse da etapa 5d): desenha o que
// src/domain/tasteCard.js calcula, busca no TMDB o que combina e gera a imagem para compartilhar.
import { tmdbGet } from '../api/tmdb.js';
import { getTitle } from '../domain/mediaItem.js';
import { matchRequest, tasteCard, unseenMatches } from '../domain/tasteCard.js';
import { isGuest, session } from '../state/appState.js';
import { registerActions } from '../ui/actions.js';
import { whileBusy } from '../ui/busy.js';
import { canShareFiles, download, toBlob } from '../ui/canvasImage.js';
import { showToast } from '../ui/feedback.js';
import { posterImg } from '../ui/icons.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { drawTasteCard } from './tasteCardImage.js';

const IMAGE_NAME = 'meu-gosto.png';

let shown = null; // { card, matches } do cartão na tela, para a imagem sair igual
let renderId = 0;

function cardHtml(card) {
  const stats = card.stats.map((s, i) => `
    <div class="taste-ticket__stat" style="--i:${i}"><dt>${escapeHtml(s.label)}</dt><dd>${escapeHtml(s.value)}</dd></div>`).join('');
  const pills = card.pills.map(p => `<li class="taste-pill${p.lit ? ' is-lit' : ''}">${escapeHtml(p.name)}</li>`).join('');
  return `
    <div class="taste-ticket__frame">
      <p class="taste-ticket__title" id="taste-title">${escapeHtml(card.title)}</p>
      <dl class="taste-ticket__stats">${stats}</dl>
      <p class="taste-ticket__label">Gêneros</p>
      <ul class="taste-ticket__genres" aria-label="Gêneros principais; acesos, os que você assiste">${pills}</ul>
      <div class="taste-ticket__matches-wrap" hidden>
        <p class="taste-ticket__label">Combina com</p>
        <ul class="taste-ticket__matches"></ul>
      </div>
    </div>
    <button type="button" class="btn-outline w-full taste-ticket__share" data-action="shareTasteCard"><span class="btn-label">Compartilhar meu gosto</span></button>`;
}

function matchHtml(movie) {
  const name = escapeHtml(getTitle(movie));
  return `<li><button type="button" class="taste-ticket__match" data-action="carregarDetalhes" data-id="${movie.id}" data-media="movie" aria-label="Abrir ${name}">${posterImg(movie.poster_path)}</button></li>`;
}

async function loadMatches(el, history, id) {
  const { card } = shown;
  if (card.matchGenre === null) return;
  const { path, params } = matchRequest(card.matchGenre);
  try {
    const data = await tmdbGet(path, params);
    if (id !== renderId) return; // o perfil foi redesenhado enquanto buscava
    shown.matches = unseenMatches(data?.results, history);
  } catch (e) {
    console.error('Erro ao buscar o que combina com o gosto:', e);
    return; // o cartão segue sem "Combina com"
  }
  el.querySelector('.taste-ticket__matches').innerHTML = shown.matches.map(matchHtml).join('');
  el.querySelector('.taste-ticket__matches-wrap').hidden = shown.matches.length === 0;
}

export function renderTasteCard(history) {
  const el = document.getElementById('taste-ticket');
  if (!el) return;
  const card = tasteCard(history, { name: isGuest() ? null : session.user?.name });
  shown = { card, matches: [] };
  el.hidden = card.empty;
  const id = ++renderId;
  if (card.empty) {
    el.replaceChildren();
    return;
  }
  el.innerHTML = cardHtml(card); // HTML novo: a entrada em sequência recomeça a cada abertura
  loadMatches(el, history, id);
}

// Celular: o compartilhar do sistema leva a imagem. Computador (ou sem esse recurso): baixa.
function shareTasteCard(button) {
  return whileBusy(button, async () => {
    const blob = await toBlob(await drawTasteCard(shown.card, shown.matches));
    const file = new File([blob], IMAGE_NAME, { type: 'image/png' });
    if (canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: shown.card.title });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    download(blob, IMAGE_NAME);
    showToast('Cartão baixado');
  }, { label: 'Gerando…', failure: 'Não foi possível gerar o cartão. Tente de novo.' });
}

registerActions({
  click: {
    shareTasteCard,
  },
});
