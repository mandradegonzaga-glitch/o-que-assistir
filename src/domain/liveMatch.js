// Match ao vivo: duas pessoas, cada uma no seu aparelho, votando ao mesmo tempo.
// As mensagens passam por um canal de broadcast (Supabase Realtime), sem banco.
// Regra de privacidade: os votos só saem do aparelho depois que as duas pessoas terminaram.

// Sem 0/O e 1/I/L: o código pode ser ditado ou digitado
export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_LENGTH = 6;
const ROOM_PATTERN = new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_LENGTH}}$`);
const ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const NAME_LIMIT = 20;
const TYPES = ['movie', 'tv', 'dorama'];

export function makeRoomCode(random = Math.random) {
  return Array.from({ length: ROOM_LENGTH }, () => ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]).join('');
}

// Aceita o código digitado de qualquer jeito: minúsculas, espaços, traços
export function normalizeRoomCode(text) {
  const code = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return ROOM_PATTERN.test(code) ? code : null;
}

const isId = value => typeof value === 'string' && ID_PATTERN.test(value);
const isName = value => typeof value === 'string' && value.trim().length > 0 && value.length <= NAME_LIMIT;
const isIndex = (value, size) => Number.isInteger(value) && value >= 0 && value <= size;

// Mensagem vinda de outro aparelho: tudo é conferido, e o que não bate vira null
export function parseLiveMessage(raw, size) {
  if (!raw || typeof raw !== 'object' || !isId(raw.from)) return null;
  const { event, from } = raw;
  switch (event) {
    case 'hello':
      return isName(raw.name) ? { event, from, name: raw.name.trim() } : null;
    case 'start': {
      const ids = raw.ids;
      const validIds = Array.isArray(ids) && ids.length >= 2 && ids.length <= 20 && ids.every(id => Number.isInteger(id) && id > 0);
      const validNames = Array.isArray(raw.names) && raw.names.length === 2 && raw.names.every(isName);
      if (!isId(raw.to) || !TYPES.includes(raw.type) || !validIds || !validNames) return null;
      return { event, from, to: raw.to, type: raw.type, ids, names: raw.names.map(n => n.trim()) };
    }
    case 'full':
      return isId(raw.to) ? { event, from, to: raw.to } : null;
    case 'progress':
      return isIndex(raw.index, size) ? { event, from, index: raw.index } : null;
    case 'done':
    case 'bye':
      return { event, from };
    case 'votes': {
      const votes = raw.votes;
      const valid = Array.isArray(votes) && votes.length <= size && new Set(votes).size === votes.length
        && votes.every(v => Number.isInteger(v) && v >= 0 && v < size);
      return valid ? { event, from, votes } : null;
    }
    default:
      return null;
  }
}

export function createLiveState(role, selfId) {
  return {
    role, // 'host' cria a sala; 'guest' entra pelo link
    selfId,
    partnerId: null,
    partnerName: null,
    partnerProgress: 0,
    partnerDone: false,
    partnerVotes: null,
    selfDone: false,
    sentVotes: false,
    finished: false,
    left: false,
  };
}

// Recebe uma mensagem (ou 'self-done') e devolve o novo estado e o que o app precisa fazer:
// { send: 'start' | 'full' | 'done' | 'votes', to? } ou um aviso ('partner-joined', 'start', 'full',
// 'progress', 'finish', 'partner-left').
export function liveReduce(state, msg) {
  const next = { ...state };
  const actions = [];

  if (msg.event === 'self-done') {
    if (state.selfDone) return { state, actions };
    next.selfDone = true;
    actions.push({ send: 'done' });
    if (state.partnerDone) actions.push({ send: 'votes' });
  } else if (msg.event === 'hello') {
    if (state.role !== 'host') return { state, actions };
    if (state.partnerId && state.partnerId !== msg.from) {
      actions.push({ send: 'full', to: msg.from });
      return { state, actions };
    }
    // O mesmo aparelho pedindo de novo (mensagem perdida, página recarregada) recebe o início de novo
    if (!state.partnerId) actions.push('partner-joined');
    next.partnerId = msg.from;
    next.partnerName = msg.name;
    next.left = false;
    actions.push({ send: 'start', to: msg.from });
  } else if (msg.event === 'start') {
    if (state.role !== 'guest' || msg.to !== state.selfId || state.partnerId) return { state, actions };
    next.partnerId = msg.from;
    next.partnerName = msg.names[0];
    actions.push('start');
  } else if (msg.event === 'full') {
    if (state.role === 'guest' && msg.to === state.selfId && !state.partnerId) actions.push('full');
    return { state, actions };
  } else {
    if (!state.partnerId || msg.from !== state.partnerId) return { state, actions };
    if (msg.event === 'progress') {
      next.partnerProgress = Math.max(state.partnerProgress, msg.index);
      actions.push('progress');
    } else if (msg.event === 'done') {
      next.partnerDone = true;
      actions.push('progress');
      if (state.selfDone) actions.push({ send: 'votes' });
    } else if (msg.event === 'votes') {
      next.partnerDone = true;
      next.partnerVotes = msg.votes;
      if (state.selfDone && !state.sentVotes) actions.push({ send: 'votes' });
    } else if (msg.event === 'bye') {
      if (state.finished) return { state, actions };
      next.left = true;
      actions.push('partner-left');
    }
  }

  if (actions.some(a => a.send === 'votes')) next.sentVotes = true;
  if (next.selfDone && next.partnerVotes && !next.finished) {
    next.finished = true;
    actions.push('finish');
  }
  return { state: next, actions };
}
