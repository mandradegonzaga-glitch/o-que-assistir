// Biblioteca do convidado: fica neste aparelho até a pessoa criar uma conta (ver legacyImport.js)
import { storage } from '../utils/storage.js';

const WATCHLIST_KEY = 'guest_watchlist';
const HISTORY_KEY = 'guest_history';
const WINS_KEY = 'guest_wins';
const BADGES_KEY = 'guest_badges';
export const GUEST_EPISODES_KEY = 'guest_episodes'; // episódios marcados (src/app/episodeStore.js)
const LISTS_KEY = 'guest_lists'; // listas personalizadas (src/app/userLists.js)

// Apagadas depois de a conta confirmar a importação (src/app/legacyImport.js)
export const GUEST_KEYS = [WATCHLIST_KEY, HISTORY_KEY, WINS_KEY, BADGES_KEY, 'guest_progress', GUEST_EPISODES_KEY, LISTS_KEY];

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
  };
}

export const saveGuestWatchlist = list => storage.set(WATCHLIST_KEY, list);
export const saveGuestHistory = list => storage.set(HISTORY_KEY, list);
export const saveGuestWins = wins => storage.set(WINS_KEY, wins);
export const saveGuestLists = lists => storage.set(LISTS_KEY, lists);

export const getGuestBadges = () => readList(BADGES_KEY);
export function addGuestBadge(name) {
  storage.set(BADGES_KEY, [...new Set([...getGuestBadges(), name])]);
}
