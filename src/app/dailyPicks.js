// Indicações do dia: último tópico do Início (filme, série e dorama), novas à meia-noite.
// Celular: 3 colunas de pôster. Computador: 3 cartões deitados na largura toda, com um trecho da sinopse.
// A escolha é de src/domain/dailyPicks.js.
import { tmdbGet } from '../api/tmdb.js';
import { PICK_KINDS, choosePick, msUntilMidnight, personalRequest, pickProfile, pickRequest, profileKey } from '../domain/dailyPicks.js';
import { GENRE_NAMES, genreNames } from '../domain/genres.js';
import { DAY_MS, localDay } from '../utils/date.js';
import { session } from '../state/appState.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatRating } from '../utils/format.js';
import { getYear, getTitle } from '../domain/mediaItem.js';
import { on } from '../state/events.js';
import { posterImg } from '../ui/icons.js';


let shownKey = null; // dia + gêneros que contam: outra pessoa (ou o gosto mudou) refaz o painel
let loadingKey = null;
let midnightTimer = null;
let hasPicks = false;

const els = () => ({
  row: document.getElementById('daily-row'),
  list: document.getElementById('daily-picks-list'),
});

// A fileira aparece com indicações carregadas e alguém dentro: antes de entrar não há de quem ser o gosto
function updateRow() {
  const { row } = els();
  if (row) row.hidden = !(hasPicks && session.currentUser);
}

// Sob medida: tenta a página do dia e, se o gênero tiver poucos títulos, a primeira.
// Sem nada que sirva (ou sem conexão para esse pedido), o cartão fica com a indicação de todo mundo.
async function loadPersonalPick(kind, index, day, profile) {
  const request = personalRequest(index, day, profile);
  if (!request) return null;
  for (const page of [...new Set([request.params.page, 1])]) {
    try {
      const data = await tmdbGet(request.path, { ...request.params, page }, { ttl: DAY_MS });
      const item = choosePick(data?.results, request.index, kind.kind, request.exclude);
      if (item) return { kind, item, genre: request.genre };
    } catch {
      return null;
    }
  }
  return null;
}

async function loadPick(kind, index, day, profile) {
  const personal = profile ? await loadPersonalPick(kind, index, day, profile) : null;
  if (personal) return personal;
  const request = pickRequest(index, day);
  // As indicações valem o dia todo: o cache pode durar mais que o dos outros pedidos
  const data = await tmdbGet(request.path, request.params, { ttl: DAY_MS });
  const item = choosePick(data?.results, request.index, kind.kind);
  return item ? { kind, item } : null;
}

// Sinopse curta; corta no fim de uma palavra
function shortOverview(text, max = 180) {
  const clean = (text || '').trim();
  if (!clean) return 'Sem sinopse.';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function cardHtml({ kind, item, genre }) {
  const why = genre ? `<span class="home-card__why">Porque você curte ${escapeHtml(GENRE_NAMES[genre])}</span>` : '';
  const title = escapeHtml(getTitle(item));
  const year = getYear(item);
  // O gênero que trouxe a indicação aparece primeiro, para combinar com o "Porque você curte"
  const ids = genre ? [genre, ...(item.genre_ids || []).filter(id => id !== genre)] : item.genre_ids;
  const meta = [year, `★ ${formatRating(item.vote_average)}`, genreNames(ids, 1)[0]].filter(Boolean).join(' · ');
  return `<li>
      <button type="button" class="home-card home-card--pick" data-kind="${kind.kind}" data-action="carregarDetalhes" data-id="${item.id}" data-media="${kind.kind}" aria-label="${kind.label} do dia: ${title}">
        ${posterImg(item.poster_path, { cls: 'home-card__poster' })}
        <span class="home-card__kind">${kind.label}</span>
        <span class="home-card__title">${title}</span>
        <span class="home-card__meta">${escapeHtml(meta)}</span>
        ${why}
        <span class="home-card__overview">${escapeHtml(shortOverview(item.overview))}</span>
      </button>
    </li>`;
}

async function renderDailyPicks() {
  const day = localDay();
  // Antes de entrar não há histórico: as de todo mundo
  const profile = session.currentUser ? pickProfile(session.user?.history) : null;
  const key = `${day}#${profileKey(profile)}`;
  if (key === shownKey || key === loadingKey) return;
  const { row, list } = els();
  if (!row || !list) return;
  loadingKey = key;

  const settled = await Promise.allSettled(PICK_KINDS.map((kind, index) => loadPick(kind, index, day, profile)));
  const picks = settled.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  // Outra pessoa entrou enquanto carregava: o pedido dela já está a caminho
  if (loadingKey !== key) return;
  loadingKey = null;

  // Sem conexão com o TMDB: a fileira some; o resto da tela continua
  hasPicks = picks.length > 0;
  if (!hasPicks) {
    updateRow();
    return;
  }
  list.innerHTML = picks.map(cardHtml).join('');
  document.getElementById('daily-picks-note').textContent = picks.some(p => p.genre)
    ? 'Escolhidos pelo seu gosto, novos à meia-noite'
    : 'Um de cada, novos à meia-noite';
  shownKey = key;
  updateRow();

  clearTimeout(midnightTimer);
  midnightTimer = setTimeout(renderDailyPicks, msUntilMidnight());
}

// Depois de entrar (conta ou convidado): as indicações passam a valer pelo gosto da pessoa
on('session:started', dailyPicksAfterLogin);
// As indicações eram pelo gosto de quem saiu: somem com a pessoa
on('session:ended', updateRow);

async function dailyPicksAfterLogin() {
  await renderDailyPicks();
  updateRow();
}

export function initDailyPicks() {
  if (!els().row) return;
  renderDailyPicks();
  // Celular que dormiu com a aba aberta: o timer da meia-noite pode não ter rodado
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderDailyPicks();
  });
}
