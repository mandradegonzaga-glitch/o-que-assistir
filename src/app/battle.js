// Cine-batalha: 8 títulos dos filtros escolhidos, de dois em dois, até sobrar um.
// O campeão abre como um sorteio (vai para o histórico de sorteios).
import { tmdbFetch } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { champion, choose, currentPair, isDone, stageLabel, stageTrack, startBattle } from '../domain/battle.js';
import { buildDiscoverUrl, getRandomPage } from '../domain/filters.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { formatRating } from '../utils/format.js';
import { filtersSummary, getFilterOptions, withDetails } from './discover.js';
import { addToSorteioHistory } from './sorteioHistory.js';
import { abrirModal } from './titleModal.js';

let battle = null;
let past = []; // como estava antes de cada voto: "Voltar" desfaz um por vez, até o começo
let loading = false;

const yearOf = item => (item.release_date || item.first_air_date || '').slice(0, 4);
const nameOf = item => item.title || item.name;

// Títulos bons e conhecidos, sem o que a pessoa já viu ou bloqueou, em ordem aleatória
async function loadPool() {
  const endpoint = state.type === 'dorama' ? 'tv' : state.type;
  const url = buildDiscoverUrl(endpoint, { ...getFilterOptions(), isDorama: state.type === 'dorama', minVotes: 300 });
  const seen = new Set([...(session.user?.history || []).map(h => h.id), ...session.blacklist]);
  const pool = new Map();
  for (const page of [getRandomPage(), 1]) {
    const data = await tmdbFetch(url + `&page=${page}`);
    (data.results || []).forEach(item => {
      if (item.poster_path && !seen.has(item.id)) pool.set(item.id, { ...item, media_type: state.type });
    });
    if (pool.size >= 8) break;
  }
  const list = [...pool.values()];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Cada lado: o pôster vota; a sinopse aparece por cima dele ao passar o mouse (ou com o foco do
// teclado) e, no toque, pelo botão "Sinopse" embaixo, que não vota
function fighter(item, side) {
  const card = document.createElement('div');
  card.className = 'battle__card';
  const synopsisId = `battle-synopsis-${side}`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'battle__fighter';
  btn.dataset.action = 'battleChoose';
  btn.dataset.arg = String(side);
  btn.setAttribute('aria-label', `Escolher ${nameOf(item)}`);
  btn.setAttribute('aria-describedby', synopsisId);
  const poster = document.createElement('span');
  poster.className = 'battle__poster';
  const img = document.createElement('img');
  img.src = IMG_URL + item.poster_path;
  img.alt = '';
  img.width = 500;
  img.height = 750;
  const synopsis = document.createElement('span');
  synopsis.className = 'battle__synopsis';
  synopsis.id = synopsisId;
  synopsis.textContent = (item.overview || '').trim() || 'Sem sinopse em português.';
  poster.append(img, synopsis);
  const name = document.createElement('span');
  name.className = 'battle__name';
  name.textContent = nameOf(item);
  const meta = document.createElement('span');
  meta.className = 'battle__meta';
  meta.textContent = [yearOf(item), `★ ${formatRating(item.vote_average)}`].filter(Boolean).join(' · ');
  btn.append(poster, name, meta);

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'battle__info';
  info.dataset.action = 'battleSynopsis';
  info.dataset.arg = String(side);
  info.setAttribute('aria-expanded', 'false');
  info.setAttribute('aria-controls', synopsisId);
  info.setAttribute('aria-label', `Sinopse de ${nameOf(item)}`);
  info.textContent = 'Sinopse';

  card.append(btn, info);
  return card;
}

// Toque: mostra ou esconde a sinopse daquele lado, sem votar
export function battleSynopsis(side) {
  const info = document.querySelector(`#battle-arena .battle__info[data-arg="${side}"]`);
  if (!info) return;
  const open = info.getAttribute('aria-expanded') !== 'true';
  info.setAttribute('aria-expanded', String(open));
  info.textContent = open ? 'Esconder' : 'Sinopse';
  info.closest('.battle__card').classList.toggle('is-reading', open);
}

function renderTrack() {
  const track = document.getElementById('battle-track');
  track.replaceChildren(...stageTrack(battle).map(stage => {
    const group = document.createElement('div');
    group.className = 'battle__stage-group';
    group.classList.toggle('is-active', stage.duels.includes('current'));
    const marks = document.createElement('div');
    marks.className = 'battle__marks';
    stage.duels.forEach(state => {
      const mark = document.createElement('span');
      mark.className = `battle__mark is-${state}`;
      marks.append(mark);
    });
    const label = document.createElement('span');
    label.className = 'battle__stage-name';
    label.textContent = stage.label;
    group.append(marks, label);
    return group;
  }));
}

function render({ focus = true } = {}) {
  const arena = document.getElementById('battle-arena');
  const done = isDone(battle);
  document.getElementById('battle-stage').textContent = done ? 'Campeão' : stageLabel(battle);
  renderTrack();
  document.getElementById('battle-undo').hidden = past.length === 0;
  document.getElementById('battle-result').hidden = !done;
  document.querySelector('#modal-battle .battle__hint').hidden = done;
  arena.hidden = done;

  if (done) {
    const winner = champion(battle);
    document.getElementById('battle-champion-img').src = IMG_URL + winner.poster_path;
    document.getElementById('battle-champion-name').textContent = nameOf(winner);
    if (focus) document.getElementById('battle-open').focus();
    return;
  }
  const [a, b] = currentPair(battle);
  const vs = document.createElement('span');
  vs.className = 'battle__vs';
  vs.setAttribute('aria-hidden', 'true');
  vs.textContent = 'VS';
  arena.replaceChildren(fighter(a, 0), vs, fighter(b, 1));
  if (focus) arena.querySelector('.battle__fighter').focus();
}

export async function abrirBatalha() {
  if (loading) return;
  loading = true;
  const btn = document.getElementById('btn-batalha');
  btn.setAttribute('aria-busy', 'true');
  try {
    const next = startBattle(await loadPool());
    if (!next) {
      showToast('Poucos títulos com esses filtros para uma batalha. Tente tirar algum filtro.', 'error');
      return;
    }
    battle = next;
    past = [];
    document.getElementById('battle-filters').textContent = filtersSummary();
    const modal = document.getElementById('modal-battle');
    const wasOpen = modal.style.display === 'flex';
    render({ focus: wasOpen });
    if (!wasOpen) modal.style.display = 'flex';
  } catch (e) {
    console.error(e);
    showToast('Erro na API.', 'error');
  } finally {
    loading = false;
    btn.removeAttribute('aria-busy');
  }
}

export function battleChoose(side) {
  if (!battle || isDone(battle)) return;
  const next = choose(battle, Number(side));
  if (next === battle) return;
  past.push(battle);
  battle = next;
  render();
}

// Desfaz o último voto (também depois do campeão, ou entre fases); o foco volta ao primeiro pôster
export function battleUndo() {
  if (!past.length) return;
  battle = past.pop();
  render(); // o foco vai para o primeiro pôster da dupla que voltou, e a fase é anunciada
}

export async function battleOpenChampion() {
  const winner = champion(battle);
  if (!winner) return;
  document.getElementById('modal-battle').style.display = 'none';
  const endpoint = state.type === 'dorama' ? 'tv' : state.type;
  abrirModal(await withDetails(winner, endpoint), { fromDraw: true });
  addToSorteioHistory(winner);
}
