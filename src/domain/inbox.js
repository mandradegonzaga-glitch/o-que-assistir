// Avisos de Amigos: compara a caixa antes e depois de atualizar e diz o que é novidade.
// Só o que chega de outra pessoa vira aviso; o que a própria pessoa fez (aceitar, apagar) não.
import { parseInvitePayload } from './match.js';
import { displayName as nameOf } from './profileName.js';

export function inboxSnapshot({ friends = [], shares = [], invites = [] }) {
  return {
    requests: new Map(friends.filter(f => f.status === 'pending' && f.direction === 'received').map(f => [f.friendship_id, nameOf(f)])),
    sentPending: new Set(friends.filter(f => f.status === 'pending' && f.direction === 'sent').map(f => f.friendship_id)),
    accepted: new Map(friends.filter(f => f.status === 'accepted').map(f => [f.friendship_id, nameOf(f)])),
    shares: new Map(shares.map(s => [s.id, { from: s.from_name, title: s.title }])),
    invites: new Map(invites.map(i => [i.id, { from: i.from_name, live: parseInvitePayload(i.payload).live }])),
  };
}

// Lista de { kind, text } com as novidades, na ordem: indicações, convites, pedidos, aceites
export function diffInbox(before, after) {
  if (!before) return []; // primeira leitura depois de entrar: só registra
  const news = [];
  after.shares.forEach((share, id) => {
    if (!before.shares.has(id)) news.push({ kind: 'share', text: `${share.from} te indicou ${share.title}` });
  });
  after.invites.forEach((invite, id) => {
    if (!before.invites.has(id)) news.push({ kind: 'invite', text: `${invite.from} te chamou para um Match${invite.live ? ' ao vivo' : ''}` });
  });
  after.requests.forEach((name, id) => {
    if (!before.requests.has(id)) news.push({ kind: 'request', text: `${name} te enviou um pedido de amizade` });
  });
  after.accepted.forEach((name, id) => {
    if (before.sentPending.has(id)) news.push({ kind: 'accepted', text: `${name} aceitou seu pedido de amizade` });
  });
  return news;
}

// Um aviso só, mesmo que tenham chegado várias coisas juntas
export function summarizeNews(news) {
  if (news.length === 0) return null;
  if (news.length === 1) return news[0].text;
  return `${news[0].text} e mais ${news.length - 1} ${news.length - 1 === 1 ? 'novidade' : 'novidades'} em Amigos`;
}
