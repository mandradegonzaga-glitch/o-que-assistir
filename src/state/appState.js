// Estado compartilhado entre os módulos. Fica em objetos porque import é somente leitura:
// `session.currentUser = x` funciona em qualquer módulo; reatribuir um `let` importado, não.
export const state = { mode: 'discover', type: 'movie', personId: null, personName: '', tab: 'watchlist', currentMovie: null, rouletteItems: [] };

// O que pertence a quem entrou. Sair volta tudo a isto: nada fica para a próxima pessoa.
function emptySession() {
  return {
    currentUser: null,   // objeto do usuário (conta), 'guest' (convidado) ou null (ninguém)
    currentUserId: null, // ID do usuário no Supabase
    userProfile: null,   // Perfil completo do Supabase
    user: { name: 'Visitante', email: '', history: [], rouletteWins: 0 },
    sorteioHistory: [],
    sorteioHistoryIndex: -1,
    blacklist: [],
    progress: { xp: 0, streak: 0, bestStreak: 0, lastVisit: null, log: [] },
    episodes: { seriesId: null, watchedKeys: new Set(), seasonData: {} },
  };
}

export const session = emptySession();

export function resetSession() {
  Object.assign(session, emptySession());
}

// Convidado guarda tudo neste aparelho; conta guarda no Supabase
export const isGuest = () => session.currentUser === 'guest';
export const isAccount = () => Boolean(session.currentUserId) && session.currentUser !== 'guest';
