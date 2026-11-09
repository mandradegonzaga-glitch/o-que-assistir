// Quero Assistir e Já Assistidos. A cópia em memória (session.user) e o armazenamento (este aparelho,
// para o convidado; o Supabase, para a conta) mudam juntos, e só depois que a gravação deu certo.
// Quem adiciona ou tira passa por aqui. Não avisa 'library:changed': a ação da pessoa avisa uma vez, no fim.
import { supabaseAddToHistory, supabaseAddToWatchlist, supabaseRemoveFromHistory, supabaseRemoveFromWatchlist } from '../api/supabase.js';
import { isGuest, session } from '../state/appState.js';
import { clearSeries } from './episodeStore.js';
import { saveGuestHistory, saveGuestWatchlist } from './guestLibrary.js';

const watchlist = () => session.user.watchlist || [];

export const inWatchlist = id => watchlist().some(item => item.id === id);
export const inHistory = id => session.user.history.some(item => item.id === id);

// Convidado grava na hora; conta espera o Supabase confirmar
async function saved(accountWrite) {
  return isGuest() || (await accountWrite()).success;
}

function setWatchlist(list) {
  session.user.watchlist = list;
  if (isGuest()) saveGuestWatchlist(list);
}

function setHistory(list) {
  session.user.history = list;
  if (isGuest()) saveGuestHistory(list);
}

// Devolvem true quando, ao terminar, o título está (ou não está) na lista como pedido
export async function addToWatchlist(item) {
  if (inWatchlist(item.id)) return true;
  if (!(await saved(() => supabaseAddToWatchlist(session.currentUserId, item)))) return false;
  setWatchlist([...watchlist(), item]);
  return true;
}

export async function removeFromWatchlist(id) {
  if (!inWatchlist(id)) return true;
  if (!(await saved(() => supabaseRemoveFromWatchlist(session.currentUserId, id)))) return false;
  setWatchlist(watchlist().filter(item => item.id !== id));
  return true;
}

export async function addToHistory(entry) {
  if (inHistory(entry.id)) return true;
  if (!(await saved(() => supabaseAddToHistory(session.currentUserId, entry)))) return false;
  setHistory([...session.user.history, entry]);
  return true;
}

// Tirar uma série de Já Assistidos pela biblioteca também zera os episódios: ela volta do zero
export async function removeFromHistory(id, { clearEpisodes = false } = {}) {
  if (!inHistory(id)) return true;
  if (!(await saved(() => supabaseRemoveFromHistory(session.currentUserId, id)))) return false;
  setHistory(session.user.history.filter(item => item.id !== id));
  if (clearEpisodes) await clearSeries(id);
  return true;
}
