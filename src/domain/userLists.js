// Listas personalizadas: regras puras. Quem lê e grava é src/app/userLists.js; o banco, database/user_lists.sql.
// Formato: { id, name, emoji, items: [{ id, title, poster, type }] }
import { MEDIA_TYPES, getTitle, isPosterPath } from './mediaItem.js';

export const LIST_EMOJIS = ['🎬', '🍿', '❤️', '🎃', '👻', '🎄', '😂', '😭', '😱', '🚀', '🧸', '🏆', '🌙', '🔥', '📚', '🎉'];
export const DEFAULT_EMOJI = LIST_EMOJIS[0];
const NAME_MAX = 40;
export const MAX_LISTS = 50;
export const MAX_ITEMS = 500;

// Espaços em volta e repetidos saem; o resto fica como a pessoa escreveu
export function cleanListName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

const sameName = (a, b) => a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');

// Devolve o motivo para não aceitar o nome, ou null. `exceptId`: a lista que está sendo renomeada.
export function listNameError(name, lists, exceptId = null) {
  const clean = cleanListName(name);
  if (!clean) return 'Dê um nome para a lista.';
  if (lists.some(l => l.id !== exceptId && sameName(cleanListName(l.name), clean))) {
    return 'Você já tem uma lista com esse nome.';
  }
  if (exceptId === null && lists.length >= MAX_LISTS) return `Você chegou ao limite de ${MAX_LISTS} listas.`;
  return null;
}

export const pickEmoji = emoji => (LIST_EMOJIS.includes(emoji) ? emoji : DEFAULT_EMOJI);

// O título como fica guardado na lista (vem do TMDB ou de um item da biblioteca)
export function toListItem(title, fallbackType = 'movie') {
  const type = title.media_type || title.type || fallbackType;
  return {
    id: title.id,
    title: getTitle(title) || 'Sem título',
    poster: title.poster_path ?? title.poster ?? null,
    type: MEDIA_TYPES.includes(type) ? type : 'movie',
  };
}

export const hasItem = (list, titleId) => list.items.some(i => i.id === titleId);

// Imutáveis: o convidado grava o resultado no aparelho; a conta, depois de o banco confirmar
export function withItem(list, item) {
  if (hasItem(list, item.id) || list.items.length >= MAX_ITEMS) return list;
  return { ...list, items: [...list.items, item] };
}

export function withoutItem(list, titleId) {
  return { ...list, items: list.items.filter(i => i.id !== titleId) };
}

// Listas do convidado, como estavam no aparelho: o que estiver fora do formato fica de fora
export function normalizeGuestLists(raw) {
  if (!Array.isArray(raw)) return [];
  const seenNames = [];
  return raw.map(list => {
    const name = cleanListName(list?.name);
    if (!name || seenNames.some(n => sameName(n, name))) return null;
    seenNames.push(name);
    const ids = new Set();
    const items = (Array.isArray(list.items) ? list.items : []).map(item => {
      const id = Number(item?.id);
      if (!Number.isInteger(id) || id <= 0 || ids.has(id)) return null;
      ids.add(id);
      return {
        id,
        title: String(item.title || 'Sem título').slice(0, 300),
        poster: isPosterPath(item.poster) ? item.poster : null,
        type: MEDIA_TYPES.includes(item.type) ? item.type : 'movie',
      };
    }).filter(Boolean).slice(0, MAX_ITEMS);
    return { id: String(list.id || name), name, emoji: pickEmoji(list.emoji), items };
  }).filter(Boolean).slice(0, MAX_LISTS);
}

// Junta as linhas do banco: listas na ordem de criação; títulos na ordem escolhida pela pessoa,
// e os que ainda não têm posição (entraram depois) no fim, na ordem em que entraram
export function buildLists(listRows, itemRows) {
  const byId = new Map(listRows.map(l => [l.id, { id: l.id, name: l.name, emoji: pickEmoji(l.emoji), shareToken: l.share_token || null, items: [] }]));
  const rank = row => (Number.isInteger(row.position) ? row.position : Infinity);
  itemRows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => rank(a.row) - rank(b.row) || a.index - b.index)
    .forEach(({ row }) => {
      byId.get(row.list_id)?.items.push({ id: row.tmdb_id, title: row.title, poster: row.poster_path, type: row.media_type });
    });
  return [...byId.values()];
}

// Move um título de posição (arrastar ou os botões ◀ ▶). Posições fora da lista não mudam nada.
export function moveItem(list, from, to) {
  const n = list.items.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return list;
  const items = [...list.items];
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved);
  return { ...list, items };
}

// Token do link público (?lista=...): um UUID, nada além disso
const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isShareToken = value => TOKEN.test(String(value ?? ''));

// Resposta do get_shared_list → { name, emoji, owner, isMine, listId, items }; null se o link não vale
export function sharedListFrom(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.items)) return null;
  return {
    name: cleanListName(data.name) || 'Lista',
    emoji: pickEmoji(data.emoji),
    owner: String(data.owner || '').slice(0, 60),
    isMine: data.is_mine === true,
    listId: data.list_id || null,
    items: normalizeGuestLists([{ name: 'x', items: data.items.map(i => ({ id: i.tmdb_id, title: i.title, poster: i.poster_path, type: i.media_type })) }])[0]?.items || [],
  };
}

export const findListByName = (lists, name) => {
  const clean = cleanListName(name);
  return lists.find(l => sameName(cleanListName(l.name), clean)) || null;
};

// Modelos com um toque: nome e emoji prontos, a lista nasce vazia
export const LIST_TEMPLATES = [
  { name: 'Favoritos', emoji: '🏆' },
  { name: 'Maratona de Halloween', emoji: '🎃' },
  { name: 'Com o mozão', emoji: '❤️' },
  { name: 'Com a família', emoji: '🧸' },
  { name: 'Sexta à noite', emoji: '🍿' },
  { name: 'Pra rir', emoji: '😂' },
];

// Só os que a pessoa ainda não tem (pelo nome)
export const availableTemplates = lists => LIST_TEMPLATES.filter(t => !findListByName(lists, t.name));
