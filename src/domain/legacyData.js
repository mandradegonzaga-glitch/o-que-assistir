// Dados da versão antiga, que guardava tudo no navegador. Lógica pura: quem lê e grava é src/app/legacyImport.js.
const TYPES = ['movie', 'tv', 'dorama'];

function normalizeItem(item) {
  const id = Number(item?.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    title: item.title || item.name || 'Sem título',
    poster: item.poster || null,
    type: TYPES.includes(item.type) ? item.type : 'movie',
    year: item.year ? String(item.year) : null,
    genres: Array.isArray(item.genres) ? item.genres : [],
  };
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  const byId = new Map();
  list.map(normalizeItem).filter(Boolean).forEach(item => {
    if (!byId.has(item.id)) byId.set(item.id, item);
  });
  return [...byId.values()];
}

// A versão antiga tinha vários perfis por navegador. Vale o perfil em uso; sem ele, a soma de todos.
// `vistos` só entra sem perfis: remover um título não o tirava de lá, e ele voltaria sozinho.
export function collectLegacyData({ allUsers, currentUser, watchlist, vistos, guest }) {
  const profiles = allUsers && typeof allUsers === 'object' ? allUsers : {};
  const active = profiles[currentUser];
  const hasActiveData = Array.isArray(active?.history) && active.history.length > 0;
  const sources = hasActiveData ? [active] : Object.values(profiles);

  const fromProfiles = sources.flatMap(p => (Array.isArray(p?.history) ? p.history : []));
  const history = normalizeList(fromProfiles.length > 0 ? fromProfiles : vistos);
  const rouletteWins = Math.max(0, ...sources.map(p => Number(p?.rouletteWins) || 0));

  return {
    history: normalizeList([...history, ...(guest?.history || [])]),
    watchlist: normalizeList([...normalizeList(watchlist), ...(guest?.watchlist || [])]),
    rouletteWins: Math.max(rouletteWins, guest?.rouletteWins || 0),
  };
}

export function hasLegacyData({ history, watchlist }) {
  return history.length > 0 || watchlist.length > 0;
}

export function stripPasswords(allUsers) {
  if (!allUsers || typeof allUsers !== 'object') return allUsers;
  return Object.fromEntries(Object.entries(allUsers).map(([name, profile]) => {
    if (!profile || typeof profile !== 'object') return [name, profile];
    const { password, ...rest } = profile;
    return [name, rest];
  }));
}
