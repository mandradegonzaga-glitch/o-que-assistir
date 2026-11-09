import { normalizeProgress } from '../domain/progress.js';

// Estado compartilhado entre os módulos. Fica em objetos porque import é somente leitura:
// `session.currentUser = x` funciona em qualquer módulo; reatribuir um `let` importado, não.
export const state = { mode: 'discover', type: 'movie', filters: emptyFilters(), tab: 'watchlist', currentMovie: null, rouletteItems: [] };

// Os filtros de descobrir. Só app/filters.js (setFilters) troca; os outros leem.
export function emptyFilters() {
  return { genre: '', mood: '', provider: '', duration: '', similar: '', yearFrom: '', yearTo: '', country: '', personId: null, personName: '' };
}

// Episódios da série aberta na página do título
export const emptyEpisodes = () => ({ seriesId: null, watchedKeys: new Set() });

// O que pertence a quem entrou. Sair volta tudo a isto: nada fica para a próxima pessoa.
function emptySession() {
  return {
    currentUser: null,   // objeto do usuário (conta), 'guest' (convidado) ou null (ninguém)
    currentUserId: null, // ID do usuário no Supabase
    userProfile: null,   // Perfil completo do Supabase
    user: { name: 'Visitante', email: '', history: [], watchlist: [], lists: [], rouletteWins: 0 },
    sorteioHistory: [],
    sorteioHistoryIndex: -1,
    blacklist: [],
    progress: normalizeProgress(null),
    episodes: emptyEpisodes(),
  };
}

export const session = emptySession();

export function resetSession() {
  Object.assign(session, emptySession());
}

// Convidado guarda tudo neste aparelho; conta guarda no Supabase
export const isGuest = () => session.currentUser === 'guest';
export const isAccount = () => Boolean(session.currentUserId) && session.currentUser !== 'guest';
