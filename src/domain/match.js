// Match no mesmo aparelho: cada pessoa vota sem ver os votos da outra.
import { MEDIA_TYPES } from './mediaItem.js';
import { shuffle } from '../utils/shuffle.js';

// Títulos por partida; um convite ou mensagem de outro aparelho não pode trazer mais
export const MATCH_SIZE = 12;

// Só títulos que as duas pessoas quiseram, na ordem em que apareceram
export function computeMatches(titles, votesA, votesB) {
  return titles.filter(title => votesA.has(title.id) && votesB.has(title.id));
}

export function pickTitles(results, blacklist = [], size = MATCH_SIZE, random = Math.random) {
  const valid = results.filter(item => item.poster_path && !blacklist.includes(item.id));
  return shuffle(valid, random).slice(0, size);
}

export function playerName(name, index) {
  return name.trim() || `Pessoa ${index + 1}`;
}

// O mesmo limite dos campos de nome (maxlength no index.html)
export const NAME_LIMIT = 20;

const toBase64Url = text => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64Url = code => new TextDecoder().decode(
  Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0))
);

// Convite no próprio link, sem banco. votesA/votesB são os índices dos títulos escolhidos.
export function encodeMatchInvite({ type, ids, nameA, votesA, nameB, votesB }) {
  const payload = { t: type, i: ids, a: nameA, x: votesA };
  if (votesB) Object.assign(payload, { b: nameB, y: votesB });
  return toBase64Url(JSON.stringify(payload));
}

const validIndexes = (list, size) => Array.isArray(list) && list.every(n => Number.isInteger(n) && n >= 0 && n < size);
const cleanName = (name, index) => playerName(typeof name === 'string' ? name.slice(0, NAME_LIMIT) : '', index);

// O link vem de fora: qualquer coisa inválida vira null em vez de quebrar a tela
export function decodeMatchInvite(code) {
  try {
    const { t, i, a, x, b, y } = JSON.parse(fromBase64Url(code));
    const validIds = Array.isArray(i) && i.length >= 2 && i.length <= MATCH_SIZE && i.every(id => Number.isInteger(id) && id > 0);
    if (!MEDIA_TYPES.includes(t) || !validIds || !validIndexes(x, i.length)) return null;
    if (y !== undefined && !validIndexes(y, i.length)) return null;
    return {
      type: t,
      ids: i,
      nameA: cleanName(a, 0),
      votesA: x,
      nameB: y === undefined ? null : cleanName(b, 1),
      votesB: y === undefined ? null : y,
    };
  } catch {
    return null;
  }
}

// Convite de Match: no link (?match=código ou ?ao-vivo=código) e pela caixa de amigos, onde
// o convite ao vivo vai como "ao-vivo:código" e o outro, só como o código
export const MATCH_PARAMS = { invite: 'match', live: 'ao-vivo' };
const LIVE_PREFIX = `${MATCH_PARAMS.live}:`;

export const invitePayload = ({ code, live = false }) => (live ? LIVE_PREFIX + code : code);

export function parseInvitePayload(payload) {
  const text = String(payload || '');
  const live = text.startsWith(LIVE_PREFIX);
  return { live, code: live ? text.slice(LIVE_PREFIX.length) : text, param: live ? MATCH_PARAMS.live : MATCH_PARAMS.invite };
}
