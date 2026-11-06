// Listas personalizadas: regras puras. Quem lê e grava é src/app/userLists.js; o banco, database/user_lists.sql.
// Formato: { id, name, emoji, items: [{ id, title, poster, type }] }

export const LIST_EMOJIS = ['🎬', '🍿', '❤️', '🎃', '👻', '🎄', '😂', '😭', '😱', '🚀', '🧸', '🏆', '🌙', '🔥', '📚', '🎉'];
export const DEFAULT_EMOJI = LIST_EMOJIS[0];
export const NAME_MAX = 40;
export const MAX_LISTS = 50;
export const MAX_ITEMS = 500;

const TYPES = ['movie', 'tv', 'dorama'];
const POSTER = /^\/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$/;

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
    title: title.title || title.name || 'Sem título',
    poster: title.poster_path ?? title.poster ?? null,
    type: TYPES.includes(type) ? type : 'movie',
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
        poster: typeof item.poster === 'string' && POSTER.test(item.poster) ? item.poster : null,
        type: TYPES.includes(item.type) ? item.type : 'movie',
      };
    }).filter(Boolean).slice(0, MAX_ITEMS);
    return { id: String(list.id || name), name, emoji: pickEmoji(list.emoji), items };
  }).filter(Boolean).slice(0, MAX_LISTS);
}

// Junta as linhas do banco: listas na ordem de criação, títulos na ordem em que entraram
export function buildLists(listRows, itemRows) {
  const byId = new Map(listRows.map(l => [l.id, { id: l.id, name: l.name, emoji: pickEmoji(l.emoji), items: [] }]));
  itemRows.forEach(row => {
    byId.get(row.list_id)?.items.push({ id: row.tmdb_id, title: row.title, poster: row.poster_path, type: row.media_type });
  });
  return [...byId.values()];
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
