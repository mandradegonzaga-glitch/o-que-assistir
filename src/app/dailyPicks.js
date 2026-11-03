// Indicações do dia num painel flutuante, aberto por um botão no canto (como um chat de ajuda).
// Abre sozinho só na primeira entrada do dia; depois, pelo botão. A escolha é de src/domain/dailyPicks.js.
import { tmdbGet } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { PICK_KINDS, choosePick, msUntilMidnight, pickRequest } from '../domain/dailyPicks.js';
import { genreNames } from '../domain/genres.js';
import { localDay } from '../domain/progress.js';
import { session } from '../state/appState.js';
import { getActiveModal } from '../ui/modals.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatRating } from '../utils/format.js';
import { storage } from '../utils/storage.js';

const DAY_MS = 86_400_000;
const SEEN_KEY = 'daily_picks_seen'; // último dia em que o painel foi aberto neste aparelho
const AUTO_OPEN_DELAY_MS = 1200;
// Quem chega por um link de título, Match ou amigo veio fazer outra coisa: nada de pop-up
const LINK_PARAMS = ['titulo', 'ao-vivo', 'match', 'amigo'];

let shownDay = null;
let loadingDay = null;
let midnightTimer = null;
let autoTimer = null;

const els = () => ({
  launcher: document.getElementById('daily-launcher'),
  panel: document.getElementById('daily-panel'),
  list: document.getElementById('daily-picks-list'),
  dot: document.querySelector('#daily-launcher .daily-launcher__dot'),
});

const seenToday = () => storage.get(SEEN_KEY, null) === localDay();

async function loadPick(kind, index, day) {
  const request = pickRequest(index, day);
  // As indicações valem o dia todo: o cache pode durar mais que o dos outros pedidos
  const data = await tmdbGet(request.path, request.params, { ttl: DAY_MS });
  const item = choosePick(data?.results, request.index, kind.kind);
  return item ? { kind, item } : null;
}

// Sinopse curta; corta no fim de uma palavra
function shortOverview(text, max = 220) {
  const clean = (text || '').trim();
  if (!clean) return 'Sem sinopse.';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function rowHtml({ kind, item }) {
  const title = escapeHtml(item.title || item.name);
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const meta = [year, `★ ${formatRating(item.vote_average)}`].filter(Boolean).join(' · ');
  const genres = genreNames(item.genre_ids, 2).join(' · ');
  return `<li>
      <button type="button" class="daily-pick" data-kind="${kind.kind}" data-action="carregarDetalhes" data-id="${item.id}" data-media="${kind.kind}" aria-label="${kind.label} do dia: ${title}" aria-describedby="daily-peek-${kind.kind}">
        <img src="${IMG_URL + item.poster_path}" alt="" width="500" height="750" loading="lazy">
        <span class="daily-pick__body">
          <span class="daily-pick__kind">${kind.label}</span>
          <span class="daily-pick__title">${title}</span>
          <span class="daily-pick__meta">${escapeHtml([meta, genres].filter(Boolean).join(' · '))}</span>
          <span class="daily-pick__overview" id="daily-peek-${kind.kind}">${escapeHtml(shortOverview(item.overview))}</span>
        </span>
      </button>
    </li>`;
}

function updateLauncher() {
  const { launcher, dot } = els();
  if (!launcher) return;
  const fresh = !seenToday();
  dot.hidden = !fresh;
  launcher.setAttribute('aria-label', fresh ? 'Indicações do dia (novas)' : 'Indicações do dia');
}

export async function renderDailyPicks() {
  const day = localDay();
  if (day === shownDay || day === loadingDay) return;
  const { launcher, list } = els();
  if (!launcher || !list) return;
  loadingDay = day;

  const settled = await Promise.allSettled(PICK_KINDS.map((kind, index) => loadPick(kind, index, day)));
  const picks = settled.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  loadingDay = null;

  // Sem conexão com o TMDB: nem botão nem painel; o resto da tela continua
  if (picks.length === 0) {
    closeDailyPicks({ returnFocus: false });
    launcher.hidden = true;
    return;
  }
  list.innerHTML = picks.map(rowHtml).join('');
  shownDay = day;
  launcher.hidden = !session.currentUser;
  updateLauncher();

  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(renderDailyPicks, msUntilMidnight());
}

export function openDailyPicks({ auto = false } = {}) {
  const { launcher, panel } = els();
  if (!panel || !shownDay) return;
  panel.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  storage.set(SEEN_KEY, localDay());
  updateLauncher();
  // Aberto pelo botão: o foco entra no painel. Sozinho, não tira o foco de onde a pessoa está.
  if (!auto) panel.querySelector('.daily-panel__close').focus();
}

export function closeDailyPicks({ returnFocus = true } = {}) {
  const { launcher, panel } = els();
  if (!panel || panel.hidden) return;
  const hadFocus = panel.contains(document.activeElement);
  panel.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
  if (returnFocus && hadFocus && !launcher.hidden) launcher.focus();
}

export function toggleDailyPicks() {
  if (els().panel?.hidden) openDailyPicks();
  else closeDailyPicks();
}

function blockedByScreen() {
  if (getActiveModal()) return true;
  const onboarding = document.getElementById('onboarding-overlay');
  if (onboarding && getComputedStyle(onboarding).display !== 'none') return true;
  const params = new URLSearchParams(location.search);
  return LINK_PARAMS.some(key => params.has(key));
}

// Depois de entrar (conta ou convidado): mostra o botão e, na primeira vez do dia, abre o painel
export async function dailyPicksAfterLogin() {
  await renderDailyPicks();
  const { launcher } = els();
  if (!shownDay || !launcher) return;
  launcher.hidden = false;
  if (seenToday()) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    if (!blockedByScreen() && !seenToday()) openDailyPicks({ auto: true });
  }, AUTO_OPEN_DELAY_MS);
}

export function initDailyPicks() {
  const { panel, list } = els();
  if (!panel) return;
  renderDailyPicks();

  // Escolher um título fecha o painel; o foco volta ao botão, para o título devolvê-lo ali ao fechar
  list.addEventListener('click', e => {
    if (e.target.closest('.daily-pick')) closeDailyPicks();
  });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !getActiveModal()) {
      e.stopPropagation();
      closeDailyPicks();
    }
  });
  // Celular que dormiu com a aba aberta: o timer da meia-noite pode não ter rodado
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderDailyPicks();
  });
}
