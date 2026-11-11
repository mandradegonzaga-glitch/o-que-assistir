// Sessão às escuras: sorteia com os filtros escolhidos e mostra só sinopse, nota, duração, década e
// gêneros. "Arriscar e revelar" abre o título de verdade; "Outro" sorteia de novo, ainda no escuro.
import { openModal, closeModal, isModalOpen } from '../ui/modals.js';
import { blindFacts, hasBlindOverview } from '../domain/blind.js';
import { state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { formatRating, joinMeta } from '../utils/format.js';
import { pickDraw, withDetails } from './discover.js';
import { discoverRequest, fetchRandomPage, filtersSummary } from './filters.js';
import { MEDIA_KIND } from '../domain/mediaItem.js';
import { registerActions } from '../ui/actions.js';
import { openDrawn } from './sorteioHistory.js';
import { whileBusy } from '../ui/busy.js';

let current = null;

async function drawBlind() {
  const item = pickDraw(await fetchRandomPage(discoverRequest({ minVotes: 200 })), hasBlindOverview);
  return item ? withDetails(item) : null;
}

function render(item) {
  const facts = blindFacts(item, state.type);
  document.getElementById('blind-title').textContent = `${MEDIA_KIND[state.type].a} misterioso`;
  document.getElementById('blind-rating').textContent = `★ ${formatRating(facts.rating)}`;
  const rest = [['blind-length', facts.length], ['blind-decade', facts.decade], ['blind-genres', joinMeta(facts.genres)]];
  rest.forEach(([id, text]) => {
    const el = document.getElementById(id);
    el.textContent = text;
    el.hidden = !text;
  });
  document.getElementById('blind-overview').textContent = facts.overview;
  document.getElementById('blind-filters').textContent = filtersSummary();
}

function sessaoEscuras() {
  const buttons = [document.getElementById('btn-escuras'), document.getElementById('blind-another')];
  return whileBusy(buttons, async () => {
    const item = await drawBlind();
    if (!item) {
      showToast('Nada encontrado com esses filtros.', 'error');
      return;
    }
    current = item;
    render(item);
    if (isModalOpen('modal-blind')) document.getElementById('blind-reveal').focus();
    else openModal('modal-blind');
  }, { failure: 'Erro na API.' });
}

function blindReveal() {
  if (!current) return;
  const item = current;
  current = null;
  closeModal('modal-blind');
  openDrawn(item);
}

registerActions({
  click: {
    sessaoEscuras,
    blindReveal,
  },
});
