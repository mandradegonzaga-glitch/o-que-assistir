// Dados da versão antiga, que guardava tudo no navegador. Lógica pura: quem lê e grava é src/app/legacyImport.js.
import { normalizeGuestLists } from './userLists.js';

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

// Episódios do convidado ({ [id]: { title, poster, type, keys: ["1396-s1-e2"] } }) viram séries com a lista de episódios.
// Chave fora do formato ou de outra série é descartada; temporada 0 (especiais) também entra, se tiver sido marcada.
const EPISODE_KEY = /^(\d+)-s(\d+)-e(\d+)$/;

export function normalizeEpisodes(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.values(data).map(entry => {
    const id = Number(entry?.id);
    if (!Number.isInteger(id) || id <= 0 || !Array.isArray(entry.keys)) return null;
    const seen = new Set();
    const episodes = [];
    entry.keys.forEach(key => {
      const m = EPISODE_KEY.exec(String(key));
      if (!m || Number(m[1]) !== id || seen.has(key)) return;
      seen.add(key);
      episodes.push({ season_number: Number(m[2]), episode_number: Number(m[3]) });
    });
    if (episodes.length === 0) return null;
    return {
      id,
      title: entry.title || 'Sem título',
      poster: entry.poster || null,
      type: entry.type === 'dorama' ? 'dorama' : 'tv',
      episodes,
    };
  }).filter(Boolean);
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
    series: normalizeEpisodes(guest?.episodes),
    lists: normalizeGuestLists(guest?.lists),
  };
}

export function hasLegacyData({ history, watchlist, series = [], lists = [] }) {
  return history.length > 0 || watchlist.length > 0 || series.length > 0 || lists.length > 0;
}

export function stripPasswords(allUsers) {
  if (!allUsers || typeof allUsers !== 'object') return allUsers;
  return Object.fromEntries(Object.entries(allUsers).map(([name, profile]) => {
    if (!profile || typeof profile !== 'object') return [name, profile];
    const { password, ...rest } = profile;
    return [name, rest];
  }));
}
