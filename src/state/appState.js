// Estado compartilhado entre os módulos. Fica em objetos porque import é somente leitura:
// `session.currentUser = x` funciona em qualquer módulo; reatribuir um `let` importado, não.
import { MAX_SORTEIO_HISTORY } from '../config/constants.js';

export { MAX_SORTEIO_HISTORY };

export const state = { type: 'movie', personId: null, tab: 'watchlist', currentMovie: null, rouletteItems: [] };

export const session = {
  currentUser: null,
  currentUserId: null, // ID do usuário no Supabase
  userProfile: null,   // Perfil completo do Supabase
  user: { name: 'Visitante', email: '', password: '', history: [], rouletteWins: 0 },
  sorteioHistory: [],
  sorteioHistoryIndex: -1,
  blacklist: [],
  episodes: { seriesId: null, watchedKeys: new Set(), seasonData: {} },
};
