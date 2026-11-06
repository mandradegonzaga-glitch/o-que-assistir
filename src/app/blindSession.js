// Sessão às escuras: sorteia com os filtros escolhidos e mostra só sinopse, nota, duração, década e
// gêneros. "Arriscar e revelar" abre o título de verdade; "Outro" sorteia de novo, ainda no escuro.
import { tmdbFetch } from '../api/tmdb.js';
import { blindFacts, hasBlindOverview } from '../domain/blind.js';
import { buildDiscoverUrl, getRandomPage } from '../domain/filters.js';
import { state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { formatRating } from '../utils/format.js';
import { filtersSummary, getFilterOptions, pickDraw, withDetails } from './discover.js';
import { addToSorteioHistory } from './sorteioHistory.js';
import { abrirModal } from './titleModal.js';

const KIND = { movie: 'Um filme', tv: 'Uma série', dorama: 'Um dorama' };
let current = null;
let loading = false;

async function drawBlind() {
  const endpoint = state.type === 'dorama' ? 'tv' : state.type;
  const url = buildDiscoverUrl(endpoint, { ...getFilterOptions(), isDorama: state.type === 'dorama', minVotes: 200 });
  let data = await tmdbFetch(url + `&page=${getRandomPage()}`);
  if (!data.results?.length) data = await tmdbFetch(url + '&page=1');
  const item = pickDraw(data.results, hasBlindOverview);
  return item ? withDetails(item, endpoint) : null;
}

function render(item) {
  const facts = blindFacts(item, state.type);
  document.getElementById('blind-title').textContent = `${KIND[state.type]} misterioso`;
  document.getElementById('blind-rating').textContent = `★ ${formatRating(facts.rating)}`;
  const rest = [['blind-length', facts.length], ['blind-decade', facts.decade], ['blind-genres', facts.genres.join(' · ')]];
  rest.forEach(([id, text]) => {
    const el = document.getElementById(id);
    el.textContent = text;
    el.hidden = !text;
  });
  document.getElementById('blind-overview').textContent = facts.overview;
  document.getElementById('blind-filters').textContent = filtersSummary();
}

export async function sessaoEscuras() {
  if (loading) return;
  loading = true;
  const buttons = [document.getElementById('btn-escuras'), document.getElementById('blind-another')];
  buttons.forEach(b => b?.setAttribute('aria-busy', 'true'));
  try {
    const item = await drawBlind();
    if (!item) {
      showToast('Nada encontrado com esses filtros.', 'error');
      return;
    }
    current = item;
    render(item);
    const modal = document.getElementById('modal-blind');
    if (modal.style.display === 'flex') document.getElementById('blind-reveal').focus();
    else modal.style.display = 'flex';
  } catch (e) {
    console.error(e);
    showToast('Erro na API.', 'error');
  } finally {
    loading = false;
    buttons.forEach(b => b?.removeAttribute('aria-busy'));
  }
}

export function blindReveal() {
  if (!current) return;
  const item = current;
  current = null;
  document.getElementById('modal-blind').style.display = 'none';
  abrirModal(item, { fromDraw: true });
  addToSorteioHistory(item);
}
