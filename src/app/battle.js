// Cine-batalha: 8 títulos dos filtros escolhidos, de dois em dois, até sobrar um.
// O campeão abre como um sorteio (vai para o histórico de sorteios).
import { IMG_URL } from '../config/constants.js';
import { champion, choose, currentPair, isDone, stageLabel, stageTrack, startBattle } from '../domain/battle.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { formatRating } from '../utils/format.js';
import { withDetails } from './discover.js';
import { discoverRequest, fetchRandomPage, filtersSummary } from './filters.js';
import { shuffle } from '../utils/shuffle.js';
import { getTmdbEndpoint, getYear, getTitle } from '../domain/mediaItem.js';
import { registerActions } from '../ui/actions.js';
import { posterEl } from '../ui/icons.js';
import { openDrawn } from './sorteioHistory.js';
import { whileBusy } from '../ui/busy.js';

let battle = null;
let past = []; // como estava antes de cada voto: "Voltar" desfaz um por vez, até o começo


// Títulos bons e conhecidos, sem o que a pessoa já viu ou bloqueou, em ordem aleatória
async function loadPool() {
  const seen = new Set([...(session.user?.history || []).map(h => h.id), ...session.blacklist]);
  const pool = await fetchRandomPage(discoverRequest({ minVotes: 300 }), { min: 8, keep: item => item.poster_path && !seen.has(item.id) });
  return shuffle(pool).map(item => ({ ...item, media_type: state.type }));
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
  btn.setAttribute('aria-label', `Escolher ${getTitle(item)}`);
  btn.setAttribute('aria-describedby', synopsisId);
  const poster = document.createElement('span');
  poster.className = 'battle__poster';
  const img = posterEl(item.poster_path, { lazy: false });
  const synopsis = document.createElement('span');
  synopsis.className = 'battle__synopsis';
  synopsis.id = synopsisId;
  synopsis.textContent = (item.overview || '').trim() || 'Sem sinopse em português.';
  poster.append(img, synopsis);
  const name = document.createElement('span');
  name.className = 'battle__name';
  name.textContent = getTitle(item);
  const meta = document.createElement('span');
  meta.className = 'battle__meta';
  meta.textContent = [getYear(item), `★ ${formatRating(item.vote_average)}`].filter(Boolean).join(' · ');
  btn.append(poster, name, meta);

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'battle__info';
  info.dataset.action = 'battleSynopsis';
  info.dataset.arg = String(side);
  info.setAttribute('aria-expanded', 'false');
  info.setAttribute('aria-controls', synopsisId);
  info.setAttribute('aria-label', `Sinopse de ${getTitle(item)}`);
  info.textContent = 'Sinopse';

  card.append(btn, info);
  return card;
}

// Toque: mostra ou esconde a sinopse daquele lado, sem votar
function battleSynopsis(side) {
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
    document.getElementById('battle-champion-name').textContent = getTitle(winner);
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

function abrirBatalha() {
  return whileBusy(document.getElementById('btn-batalha'), async () => {
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
  }, { failure: 'Erro na API.' });
}

function battleChoose(side) {
  if (!battle || isDone(battle)) return;
  const next = choose(battle, Number(side));
  if (next === battle) return;
  past.push(battle);
  battle = next;
  render();
}

// Desfaz o último voto (também depois do campeão, ou entre fases); o foco volta ao primeiro pôster
function battleUndo() {
  if (!past.length) return;
  battle = past.pop();
  render(); // o foco vai para o primeiro pôster da dupla que voltou, e a fase é anunciada
}

async function battleOpenChampion() {
  const winner = champion(battle);
  if (!winner) return;
  document.getElementById('modal-battle').style.display = 'none';
  const endpoint = getTmdbEndpoint(state.type);
  openDrawn(await withDetails(winner, endpoint));
}

registerActions({
  click: {
    abrirBatalha,
    battleOpenChampion,
    battleChoose: el => battleChoose(el.dataset.arg),
    battleSynopsis: el => battleSynopsis(el.dataset.arg),
    battleUndo,
  },
});
