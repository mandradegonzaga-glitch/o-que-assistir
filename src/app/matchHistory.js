// Lista do Match na tela inicial do Match. Conta: metadados do usuário (sincroniza entre aparelhos,
// sem tabela nova). Convidado: neste aparelho. Cada pessoa da partida guarda a sua cópia.
import { supabaseUpdateUserData } from '../api/supabase.js';
import { tmdbGet } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { addMatchEntry, formatMatchDate, normalizeMatchHistory, removeMatchEntry } from '../domain/matchHistory.js';
import { session } from '../state/appState.js';
import { pendingRemovals, scheduleUndoable, showToast } from '../ui/feedback.js';
import { storage } from '../utils/storage.js';
import { addManyToWatchlist } from './library.js';

const GUEST_KEY = 'guest_match_history';
const isAccount = () => Boolean(session.currentUserId) && session.currentUser !== 'guest';

function load() {
  if (!session.currentUser) return [];
  return normalizeMatchHistory(isAccount() ? session.currentUser?.user_metadata?.matchHistory : storage.get(GUEST_KEY, []));
}

function save(history) {
  if (isAccount()) {
    // Mantém a cópia em memória igual ao que foi gravado
    session.currentUser.user_metadata = { ...session.currentUser.user_metadata, matchHistory: history };
    supabaseUpdateUserData({ matchHistory: history });
  } else {
    storage.set(GUEST_KEY, history);
  }
}

export function recordMatch({ partner, type, ids }) {
  if (!session.currentUser || ids.length === 0) return;
  save(addMatchEntry(load(), { at: new Date().toISOString(), with: partner, type, ids }));
}

const endpoint = type => (type === 'dorama' ? 'tv' : type);

// Títulos de uma partida: do cache do TMDB quando já foram vistos. Um que falhe some da linha, sem quebrar as outras.
async function loadTitles(entry) {
  const loaded = await Promise.all(entry.ids.map(id => tmdbGet(`/${endpoint(entry.type)}/${id}`).catch(() => null)));
  return loaded.filter(Boolean);
}

function titleButton(title, type) {
  const name = title.title || title.name || '';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'match-history__title';
  button.dataset.action = 'carregarDetalhes';
  button.dataset.id = title.id;
  button.dataset.media = type;
  button.setAttribute('aria-label', `Abrir ${name}`);
  const image = document.createElement('img');
  image.alt = '';
  image.width = 500;
  image.height = 750;
  image.loading = 'lazy';
  if (title.poster_path) image.src = IMG_URL + title.poster_path;
  const label = document.createElement('span');
  label.textContent = name;
  button.append(image, label);
  return button;
}

function actionButton(label, action, at, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-clear-small';
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.arg = at;
  button.setAttribute('aria-label', ariaLabel);
  return button;
}

let renderToken = 0;

export async function renderMatchHistory() {
  const box = document.getElementById('match-history');
  if (!box) return;
  const token = ++renderToken;
  const history = load().filter(entry => !pendingRemovals.has(`match-history:${entry.at}`));
  box.hidden = history.length === 0;
  if (history.length === 0) return;

  const rows = await Promise.all(history.map(async entry => ({ entry, titles: await loadTitles(entry) })));
  if (token !== renderToken) return; // outro desenho começou enquanto os títulos carregavam

  document.getElementById('match-history-list').replaceChildren(...rows.filter(r => r.titles.length).map(({ entry, titles }) => {
    const item = document.createElement('li');
    item.className = 'match-history__item';
    const meta = document.createElement('p');
    meta.className = 'match-history__meta';
    meta.textContent = `Com ${entry.with} · ${formatMatchDate(entry.at)}`;
    const grid = document.createElement('div');
    grid.className = 'match-history__titles';
    grid.append(...titles.map(t => titleButton(t, entry.type)));
    const actions = document.createElement('div');
    actions.className = 'match-history__actions';
    actions.append(
      actionButton('Salvar em Quero Assistir', 'matchHistorySave', entry.at, `Salvar os matches com ${entry.with} em Quero Assistir`),
      actionButton('Apagar', 'matchHistoryRemove', entry.at, `Apagar os matches com ${entry.with} de ${formatMatchDate(entry.at)}`),
    );
    item.append(meta, grid, actions);
    return item;
  }));
}

export async function matchHistorySave(at) {
  const entry = load().find(e => e.at === at);
  if (!entry) return;
  const titles = await loadTitles(entry);
  const added = await addManyToWatchlist(titles.map(t => ({ ...t, media_type: entry.type })));
  showToast(added
    ? `${added === 1 ? 'Título salvo' : `${added} títulos salvos`} em Quero Assistir!`
    : 'Esses títulos já estão em Quero Assistir.');
}

// Apagar tem "Desfazer" (e Ctrl+Z), como as outras remoções do app
export function matchHistoryRemove(at) {
  const entry = load().find(e => e.at === at);
  if (!entry) return;
  const key = `match-history:${at}`;
  scheduleUndoable({
    message: `Matches com ${entry.with} apagados.`,
    apply: () => {
      const hadFocus = document.getElementById('match-history').contains(document.activeElement);
      pendingRemovals.add(key);
      renderMatchHistory();
      return hadFocus;
    },
    undo: async (refocus) => {
      pendingRemovals.delete(key);
      await renderMatchHistory();
      if (refocus) document.querySelector(`#match-history [data-action="matchHistoryRemove"][data-arg="${CSS.escape(at)}"]`)?.focus();
    },
    commit: () => {
      save(removeMatchEntry(load(), at));
      pendingRemovals.delete(key);
      renderMatchHistory();
    },
    focusAfter: () => document.querySelector('#match-history .match-history__title') || document.getElementById('btn-match-start'),
  });
}
