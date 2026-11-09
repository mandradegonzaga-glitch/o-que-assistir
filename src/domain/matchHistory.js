// Lista do Match: os matches de cada partida, com quem e quando.
// Guarda só ids (nome, pôster e sinopse vêm do TMDB ao mostrar): cabe nos metadados da conta.
import { MEDIA_TYPES } from './mediaItem.js';
import { MATCH_SIZE, NAME_LIMIT } from './match.js';

export const HISTORY_SIZE = 15;
const PARTNERS_LIMIT = NAME_LIMIT * 2 + 5; // "Fulano e Beltrana", com os dois nomes no limite

function validEntry(entry) {
  return entry && typeof entry === 'object'
    && typeof entry.at === 'string' && !Number.isNaN(Date.parse(entry.at))
    && typeof entry.with === 'string' && entry.with.trim().length > 0 && entry.with.length <= PARTNERS_LIMIT
    && MEDIA_TYPES.includes(entry.type)
    && Array.isArray(entry.ids) && entry.ids.length > 0 && entry.ids.length <= MATCH_SIZE
    && entry.ids.every(id => Number.isInteger(id) && id > 0);
}

export function normalizeMatchHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(validEntry).slice(0, HISTORY_SIZE)
    .map(({ at, with: partner, type, ids }) => ({ at, with: partner, type, ids: [...new Set(ids)] }));
}

// Mesma partida vista de novo (abrir o link do resultado outra vez, recarregar) não vira outra linha
const sameMatch = (a, b) => a.type === b.type && a.with === b.with && a.at.slice(0, 10) === b.at.slice(0, 10)
  && a.ids.length === b.ids.length && a.ids.every(id => b.ids.includes(id));

export function addMatchEntry(history, entry, size = HISTORY_SIZE) {
  const clean = { ...entry, with: String(entry.with || '').trim().slice(0, PARTNERS_LIMIT), ids: [...new Set(entry.ids || [])].slice(0, MATCH_SIZE) };
  if (!validEntry(clean)) return history;
  return [clean, ...history.filter(old => !sameMatch(old, clean))].slice(0, size);
}

export function removeMatchEntry(history, at) {
  return history.filter(entry => entry.at !== at);
}

// "3 de nov." — curto, no fuso de quem vê
export function formatMatchDate(iso, locale = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(iso));
}
