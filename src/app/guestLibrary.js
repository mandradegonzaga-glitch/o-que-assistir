// Biblioteca do convidado: fica neste aparelho até a pessoa criar uma conta (ver legacyImport.js)
import { storage } from '../utils/storage.js';

const WATCHLIST_KEY = 'guest_watchlist';
const HISTORY_KEY = 'guest_history';
const WINS_KEY = 'guest_wins';
const BADGES_KEY = 'guest_badges';
const GUEST_EPISODES_KEY = 'guest_episodes'; // episódios marcados (src/app/episodeStore.js)
const LISTS_KEY = 'guest_lists'; // listas personalizadas (src/app/userLists.js)
const GUEST_PROGRESS_KEY = 'guest_progress'; // XP, sequência e desafios (src/app/progress.js)
const MATCH_HISTORY_KEY = 'guest_match_history'; // lista do Match (src/app/matchHistory.js)
// Nomes da versão antiga, mantidos para não perder o que já está salvo
const SORTEIOS_KEY = 'sorteio_history';
const BLACKLIST_KEY = 'blacklist'; // ids
const BLACKLIST_DETAILS_KEY = 'blacklist_details'; // { tmdb_id, title, poster_path }, para a lista no perfil

// Apagadas depois de a conta confirmar a importação (src/app/legacyImport.js)
export const GUEST_KEYS = [WATCHLIST_KEY, HISTORY_KEY, WINS_KEY, BADGES_KEY, GUEST_PROGRESS_KEY, GUEST_EPISODES_KEY, LISTS_KEY];

const readList = key => {
  const list = storage.get(key, []);
  return Array.isArray(list) ? list : [];
};

export function getGuestData() {
  return {
    watchlist: readList(WATCHLIST_KEY),
    history: readList(HISTORY_KEY),
    rouletteWins: Number(storage.get(WINS_KEY, 0)) || 0,
    episodes: storage.get(GUEST_EPISODES_KEY, {}),
    lists: readList(LISTS_KEY),
    sorteioHistory: readList(SORTEIOS_KEY),
    blacklist: readList(BLACKLIST_KEY),
  };
}

export const saveGuestWatchlist = list => storage.set(WATCHLIST_KEY, list);
export const saveGuestHistory = list => storage.set(HISTORY_KEY, list);
export const saveGuestWins = wins => storage.set(WINS_KEY, wins);
export const saveGuestLists = lists => storage.set(LISTS_KEY, lists);
export const saveGuestSorteioHistory = list => storage.set(SORTEIOS_KEY, list);

// { [seriesId]: { id, title, poster, type, keys: [], updatedAt } }
export function getGuestEpisodes() {
  const data = storage.get(GUEST_EPISODES_KEY, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}
export const saveGuestEpisodes = data => storage.set(GUEST_EPISODES_KEY, data);

export const getGuestProgress = () => storage.get(GUEST_PROGRESS_KEY, null);
export const saveGuestProgress = progress => storage.set(GUEST_PROGRESS_KEY, progress);

export const getGuestMatchHistory = () => readList(MATCH_HISTORY_KEY);
export const saveGuestMatchHistory = history => storage.set(MATCH_HISTORY_KEY, history);

// Ignorados: os ids (para os sorteios) e os detalhes (para a lista no perfil) andam juntos
export const getGuestBlacklistDetails = () => readList(BLACKLIST_DETAILS_KEY);
export function saveGuestBlacklist(ids, details) {
  storage.set(BLACKLIST_KEY, ids);
  storage.set(BLACKLIST_DETAILS_KEY, details);
}

export const getGuestBadges = () => readList(BADGES_KEY);
export function addGuestBadge(name) {
  storage.set(BADGES_KEY, [...new Set([...getGuestBadges(), name])]);
}
