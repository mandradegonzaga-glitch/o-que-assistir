// Amigos e convites de Match dentro do app. Exige conta e as tabelas de database/friends.sql:
// sem elas, as seções ficam ocultas e o Match por link continua funcionando.
import {
  supabaseAcceptFriend, supabaseDeleteMatchInvite, supabaseDeleteTitleShare, supabaseFindUser, supabaseGetFriendProfile, supabaseListFriends,
  supabaseListMatchInvites, supabaseListTitleShares, supabaseRemoveFriend, supabaseRequestFriend, supabaseSendMatchInvite, supabaseSendTitleShare,
  supabaseUpdateProfile, subscribeInbox,
} from '../api/supabase.js';
import { IMG_URL } from '../config/constants.js';
import { BADGE_DEFINITIONS } from '../domain/badges.js';
import { diffInbox, inboxSnapshot, summarizeNews } from '../domain/inbox.js';
import { shareRow, titleKind } from '../domain/titleShare.js';
import { session, state } from '../state/appState.js';
import { BADGE_ICONS } from '../ui/badgeIcons.js';
import { switchMode } from '../ui/navigation.js';
import { formatCount } from '../utils/format.js';
import { shareLink } from './match.js';
import { showToast } from '../ui/feedback.js';
import { pendingRemovals, scheduleUndoable } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { notifyDevice, renderDeviceNotify } from './notifications.js';
import { recordSocial, trackChallenge } from './progress.js';
import { carregarDetalhes } from './titleModal.js';

const FRIEND_PARAM = 'amigo';

let friends = [];
let available = false;
let shares = [];
let sharesAvailable = false; // title_shares.sql pode ainda não ter sido rodado
let invites = [];
let lastSnapshot = null; // a caixa na última leitura: o que aparecer de novo vira aviso
let stopInbox = null;
let watchedUser = null;
const INBOX_POLL_MS = 120000;
let currentFriend = null;

const hasAccount = () => Boolean(session.currentUserId) && session.currentUser !== 'guest';
const accepted = () => friends.filter(f => f.status === 'accepted');
const nameOf = friend => friend.display_name || friend.username;

function button(label, action, id, className = 'btn-clear-small') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  el.dataset.action = action;
  el.dataset.arg = id;
  return el;
}

function friendRow(friend, ...actions) {
  const row = document.createElement('li');
  row.className = 'friend-row';
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = nameOf(friend).charAt(0).toUpperCase();
  const name = document.createElement('span');
  name.className = 'friend-row__name';
  name.textContent = nameOf(friend);
  const handle = document.createElement('small');
  handle.textContent = `@${friend.username}`;
  name.append(handle);
  row.append(avatar, name, ...actions);
  return row;
}

function renderList(id, items) {
  const list = document.getElementById(id);
  list.replaceChildren(...items);
  list.closest('[data-friends-group]').hidden = items.length === 0;
}

function renderFriends() {
  const account = hasAccount();
  document.getElementById('friends-guest').hidden = account;
  document.getElementById('friends-unavailable').hidden = !account || available;
  document.getElementById('friends-content').hidden = !account || !available;

  const received = friends.filter(f => f.status === 'pending' && f.direction === 'received');
  renderBadge(received.length);

  if (account && available) {
    document.getElementById('my-username').textContent = session.userProfile?.username ? `@${session.userProfile.username}` : '';

    document.getElementById('friends-share').checked = session.userProfile?.share_with_friends !== false;
    renderDeviceNotify();

    renderList('friends-received', received
      .map(f => friendRow(f, button('Aceitar', 'friendAccept', f.friendship_id, 'btn-main friend-action'), button('Recusar', 'friendRemove', f.friendship_id))));
    renderList('friends-sent', friends.filter(f => f.status === 'pending' && f.direction === 'sent')
      .map(f => friendRow(f, button('Cancelar', 'friendRemove', f.friendship_id))));
    renderList('friends-list', accepted()
      .map(f => friendRow(f, button('Ver perfil', 'friendOpen', f.other_id, 'btn-outline friend-action'))));
    document.getElementById('friends-empty').hidden = accepted().length > 0 || received.length > 0;
  }

  renderFriendTargets();
}

function renderBadge(requests, shareCount = visibleShares().length) {
  const total = requests + shareCount;
  const parts = [
    requests ? `${requests} ${requests === 1 ? 'pedido de amizade' : 'pedidos de amizade'}` : '',
    shareCount ? `${shareCount} ${shareCount === 1 ? 'indicação' : 'indicações'}` : '',
  ].filter(Boolean);
  const badge = document.getElementById('friends-badge');
  badge.textContent = total;
  badge.hidden = total === 0;
  // O número sozinho não diz nada a quem ouve: o nome do botão leva o que está esperando
  document.getElementById('btn-friends').setAttribute('aria-label', parts.length ? `Amigos: ${parts.join(' e ')}` : 'Amigos');
}

// "Enviar para" nas telas de convite e de resultado do Match, e no compartilhar do título
function renderFriendTargets() {
  document.querySelectorAll('[data-friend-targets]').forEach(box => {
    const list = box.querySelector('.friend-targets');
    list.replaceChildren(...accepted().map(f => button(nameOf(f), 'friendSendMatch', f.other_id, 'btn-outline friend-target')));
    box.hidden = !hasAccount() || !available || accepted().length === 0;
  });

  const ready = hasAccount() && available && sharesAvailable;
  const box = document.getElementById('share-friends');
  box.querySelector('.friend-targets').replaceChildren(...accepted().map(f => button(nameOf(f), 'friendSendTitle', f.other_id, 'btn-outline friend-target')));
  box.hidden = !ready || accepted().length === 0;
  const hint = document.getElementById('share-friends-hint');
  hint.hidden = ready && accepted().length > 0;
  if (!hasAccount()) hint.textContent = 'Com uma conta, você também envia para amigos aqui do app.';
  else if (!ready) hint.textContent = 'Envio para amigos indisponível no momento.';
  else hint.textContent = 'Adicione amigos para enviar títulos para eles aqui do app.';
}

export function openFriends() {
  document.getElementById('modal-friends').style.display = 'flex';
  refreshFriends();
}

export async function toggleShareWithFriends(input) {
  const share = input.checked;
  const result = await supabaseUpdateProfile(session.currentUserId, { share_with_friends: share });
  if (!result.success) {
    input.checked = !share;
    showToast('Não foi possível salvar. Tente de novo.', 'error');
    return;
  }
  session.userProfile = { ...session.userProfile, share_with_friends: share };
  showToast(share ? 'Seus amigos voltam a ver sua atividade.' : 'Sua atividade está oculta para os amigos.');
}

// Uma atualização por vez: chamadas no meio de outra pedem mais uma rodada no fim
let running = null;
let queued = false;
export function refreshFriends() {
  if (running) {
    queued = true;
    return running;
  }
  running = loadFriends().finally(() => {
    running = null;
    if (queued) {
      queued = false;
      refreshFriends();
    }
  });
  return running;
}

async function loadFriends() {
  if (!hasAccount()) {
    friends = [];
    available = false;
    shares = [];
    sharesAvailable = false;
    invites = [];
    lastSnapshot = null;
    stopWatching();
    renderFriends();
    renderShares();
    renderInbox([]);
    return;
  }
  const [result, shareResult] = await Promise.all([supabaseListFriends(session.currentUserId), supabaseListTitleShares()]);
  available = result.success;
  friends = result.friends || [];
  sharesAvailable = shareResult.success;
  shares = shareResult.shares || [];
  renderFriends();
  renderShares();
  if (available) recordSocial('friends', accepted().length);
  await refreshInbox();
  if (available) {
    announce();
    watchInbox();
  }
}

// O que chegou desde a última leitura: um aviso dentro do app e, com o app em segundo plano, no aparelho
function announce() {
  const snapshot = inboxSnapshot({ friends, shares, invites });
  const text = summarizeNews(diffInbox(lastSnapshot, snapshot));
  lastSnapshot = snapshot;
  if (!text) return;
  showToast(text);
  notifyDevice(text);
}

let refreshTimer;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshFriends, 400); // várias mudanças juntas viram uma leitura só
}

function watchInbox() {
  if (stopInbox && watchedUser === session.currentUserId) return;
  stopWatching();
  watchedUser = session.currentUserId;
  stopInbox = subscribeInbox(watchedUser, scheduleRefresh);
}

function stopWatching() {
  stopInbox?.();
  stopInbox = null;
  watchedUser = null;
}

// Sem o SQL do tempo real (ou com a conexão caindo), as novidades aparecem ao voltar para o app
// e numa conferência a cada 2 minutos
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && hasAccount() && available) refreshFriends();
});
setInterval(() => {
  if (hasAccount() && available) refreshFriends();
}, INBOX_POLL_MS);

// Indicações recebidas: pôster, quem mandou, abrir e apagar
function shareItem(item) {
  const row = document.createElement('li');
  row.className = 'friend-row share-row';
  const image = document.createElement('img');
  image.className = 'share-row__poster';
  image.alt = '';
  image.width = 40;
  image.height = 60;
  image.loading = 'lazy';
  if (item.poster_path) image.src = IMG_URL + item.poster_path;
  const name = document.createElement('span');
  name.className = 'friend-row__name';
  name.textContent = item.title;
  const from = document.createElement('small');
  from.textContent = `Indicado por ${item.from_name}`;
  name.append(from);
  const open = button('Abrir', 'friendShareOpen', item.id, 'btn-outline friend-action');
  open.setAttribute('aria-label', `Abrir ${item.title}`);
  const remove = button('Apagar', 'friendShareDelete', item.id);
  remove.setAttribute('aria-label', `Apagar indicação de ${item.title}`);
  row.append(image, name, open, remove);
  return row;
}

const visibleShares = () => shares.filter(s => !pendingRemovals.has(`share:${s.id}`));

function renderShares() {
  const visible = visibleShares();
  renderList('title-shares', visible.map(shareItem));
  renderBadge(friends.filter(f => f.status === 'pending' && f.direction === 'received').length, visible.length);
}

// Depois de tirar um item da caixa, o foco vai para o próximo, ou para o título da seção
function focusAfterShares() {
  const next = document.querySelector('#title-shares [data-action="friendShareOpen"]');
  if (next) return next;
  const heading = document.getElementById('title-shares-heading');
  return heading.closest('[hidden]') ? document.querySelector('#modal-friends [role="dialog"]') : heading;
}

export async function friendSendTitle(el) {
  const friendId = el.dataset.arg;
  const friend = friends.find(f => f.other_id === friendId);
  const movie = state.currentMovie;
  const row = movie && shareRow(movie, titleKind(movie, state.type));
  // aria-disabled em vez de disabled: o botão continua com o foco depois de enviar
  if (!row || !friend || el.getAttribute('aria-disabled') === 'true') return;
  el.setAttribute('aria-disabled', 'true');
  const result = await supabaseSendTitleShare(session.currentUserId, friendId, row);
  if (result.success || result.duplicate) {
    el.textContent = `${nameOf(friend)} ✓`;
    el.setAttribute('aria-label', `Enviado para ${nameOf(friend)}`);
    showToast(result.success ? `Enviado para ${nameOf(friend)}!` : `${nameOf(friend)} já recebeu este título.`);
    if (result.success) {
      recordSocial('sharesSent');
      trackChallenge('shared');
    }
    return;
  }
  el.removeAttribute('aria-disabled');
  showToast('Não foi possível enviar. Tente de novo.', 'error');
}

// Abrir tira da caixa: o título abre por cima da lista (fechar volta para ela),
// e de lá a pessoa salva na lista dela se quiser
export async function friendShareOpen(id) {
  const item = shares.find(s => s.id === id);
  if (!item) return;
  shares = shares.filter(s => s.id !== id);
  renderShares();
  focusAfterShares()?.focus(); // o botão clicado sumiu: o modal do título devolve o foco para cá
  supabaseDeleteTitleShare(id);
  await carregarDetalhes(item.tmdb_id, item.media_type);
}

// Apagar tem "Desfazer" (e Ctrl+Z), como as outras remoções do app
export function friendShareDelete(id) {
  const item = shares.find(s => s.id === id);
  if (!item) return;
  const key = `share:${id}`;
  scheduleUndoable({
    message: `Indicação de ${item.title} apagada.`,
    apply: () => {
      const hadFocus = document.getElementById('title-shares').contains(document.activeElement);
      pendingRemovals.add(key);
      renderShares();
      return hadFocus;
    },
    undo: (refocus) => {
      pendingRemovals.delete(key);
      renderShares();
      if (refocus) document.querySelector(`#title-shares [data-action="friendShareOpen"][data-arg="${CSS.escape(id)}"]`)?.focus();
    },
    commit: async () => {
      const result = await supabaseDeleteTitleShare(id);
      pendingRemovals.delete(key);
      if (result.success) shares = shares.filter(s => s.id !== id);
      else showToast('Não foi possível apagar a indicação. Tente de novo.', 'error');
      renderShares();
    },
    focusAfter: focusAfterShares,
  });
}

export async function friendAdd() {
  const input = document.getElementById('friend-username');
  const username = input.value.trim().replace(/^@/, '');
  if (!username) return;
  if (await requestFriendship(username)) input.value = '';
}

async function requestFriendship(username) {
  const found = await supabaseFindUser(username);
  if (!found.success) {
    showToast('Não foi possível buscar agora. Tente de novo.', 'error');
    return false;
  }
  if (!found.user) {
    showToast('Nenhuma conta com esse usuário. Confira como a pessoa escreve.', 'error');
    return false;
  }

  const result = await supabaseRequestFriend(session.currentUserId, found.user.id);
  let sent = false;
  if (result.duplicate) {
    showToast('Vocês já têm um pedido ou amizade.', 'warning');
  } else if (!result.success) {
    showToast('Não foi possível enviar o pedido. Tente de novo.', 'error');
  } else {
    sent = true;
    showToast(`Pedido enviado para ${nameOf(found.user)}!`);
  }
  await refreshFriends();
  return sent;
}

export async function friendAccept(id) {
  const result = await supabaseAcceptFriend(id);
  showToast(result.success ? 'Amizade aceita!' : 'Não foi possível aceitar. Tente de novo.', result.success ? 'success' : 'error');
  await refreshFriends();
}

export async function friendRemove(id) {
  const result = await supabaseRemoveFriend(id);
  if (!result.success) showToast('Não foi possível concluir. Tente de novo.', 'error');
  await refreshFriends();
}

export async function friendUnfriend(id) {
  const friend = friends.find(f => f.friendship_id === id);
  const ok = await confirmDialog({
    title: 'Remover amizade',
    message: `Remover ${friend ? nameOf(friend) : 'esta pessoa'} dos seus amigos?`,
    confirmLabel: 'Remover',
    danger: true,
  });
  if (ok) {
    await friendRemove(id);
    document.getElementById('modal-friend').style.display = 'none';
  }
}

// Link que já chega com o usuário preenchido: é a forma mais fácil de adicionar alguém
export function friendInvite() {
  const username = session.userProfile?.username;
  if (!username) return;
  const url = `${location.origin}${location.pathname}?${FRIEND_PARAM}=${encodeURIComponent(username)}`;
  shareLink(url, 'Vamos ser amigos no O Que Assistir? Assim dá para ver o que cada um assistiu e fazer Match.');
}

// Chamado depois do login: quem abriu o link confirma e pronto
export async function openFriendLinkFromUrl() {
  const url = new URL(location.href);
  const username = url.searchParams.get(FRIEND_PARAM);
  if (!username) return;
  if (!session.currentUser) return; // a tela de entrada está aberta: volta aqui depois do login

  url.searchParams.delete(FRIEND_PARAM);
  history.replaceState(null, '', url);
  openFriends();
  if (!hasAccount()) {
    showToast('Crie uma conta para adicionar amigos.', 'warning');
    return;
  }

  const clean = username.trim().replace(/^@/, '');
  if (clean === session.userProfile?.username) {
    showToast('Este é o seu próprio link. Envie para um amigo!');
    return;
  }
  const ok = await confirmDialog({
    title: 'Adicionar amigo',
    message: `Enviar pedido de amizade para @${clean}?`,
    confirmLabel: 'Enviar pedido',
  });
  if (ok) await requestFriendship(clean);
}

function titleCard(item) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'friend-title';
  card.dataset.action = 'carregarDetalhes';
  card.dataset.id = item.tmdb_id;
  card.dataset.media = item.media_type;
  card.setAttribute('aria-label', item.title);
  const image = document.createElement('img');
  image.alt = '';
  image.width = 500;
  image.height = 750;
  image.loading = 'lazy';
  if (item.poster_path) image.src = IMG_URL + item.poster_path;
  const name = document.createElement('span');
  name.textContent = item.title;
  card.append(image, name);
  return card;
}

function fillGrid(id, items, emptyText) {
  const grid = document.getElementById(id);
  if (items.length === 0) {
    const note = document.createElement('p');
    note.className = 'section-note';
    note.textContent = emptyText;
    grid.replaceChildren(note);
    return;
  }
  grid.replaceChildren(...items.map(titleCard));
}

export async function friendOpen(friendId) {
  const friend = friends.find(f => f.other_id === friendId);
  const result = await supabaseGetFriendProfile(friendId);
  if (!result.success || !result.profile) {
    showToast('Não foi possível abrir este perfil. Tente de novo.', 'error');
    return;
  }

  const { profile } = result;
  const name = profile.display_name || profile.username;
  currentFriend = { id: friendId, friendshipId: friend?.friendship_id };

  document.getElementById('friend-avatar').textContent = name.charAt(0).toUpperCase();
  document.getElementById('friend-title').textContent = name;
  document.getElementById('friend-handle').textContent = `@${profile.username}`;
  // Quem escolheu não compartilhar: o servidor nem envia os dados
  const hidden = Boolean(profile.private);
  document.getElementById('friend-private').hidden = !hidden;
  document.getElementById('friend-activity').hidden = hidden;

  document.getElementById('friend-stat-watched').textContent = formatCount(profile.history.length);
  document.getElementById('friend-stat-wants').textContent = formatCount(profile.watchlist.length);
  document.getElementById('friend-stat-badges').textContent = formatCount(profile.badges.length);

  // O que vale conversar: os dois querem ver o mesmo título
  const mine = new Set((session.user.watchlist || []).map(i => i.id));
  const common = profile.watchlist.filter(i => mine.has(i.tmdb_id));
  document.getElementById('friend-common-box').hidden = common.length === 0;
  fillGrid('friend-common', common, '');

  fillGrid('friend-history', profile.history, 'Ainda não marcou nada como assistido.');
  fillGrid('friend-watchlist', profile.watchlist, 'A lista está vazia.');

  const badges = document.getElementById('friend-badges');
  const earned = BADGE_DEFINITIONS.filter(b => profile.badges.includes(b.name));
  badges.replaceChildren(...earned.map(badge => {
    const chip = document.createElement('div');
    chip.className = 'badge-item unlocked';
    chip.dataset.color = badge.color;
    chip.innerHTML = `<div class="badge-icon">${BADGE_ICONS[badge.icon]}</div><div class="badge-info"><h4></h4><p></p></div>`;
    chip.querySelector('h4').textContent = badge.name;
    chip.querySelector('p').textContent = badge.desc;
    return chip;
  }));
  document.getElementById('friend-badges-box').hidden = earned.length === 0;

  document.getElementById('modal-friend').style.display = 'flex';
}

export function friendUnfriendCurrent() {
  if (currentFriend?.friendshipId) friendUnfriend(currentFriend.friendshipId);
}

export function friendMatchCurrent() {
  document.getElementById('modal-friend').style.display = 'none';
  document.getElementById('modal-friends').style.display = 'none';
  switchMode('match');
}

export async function sendInviteToFriend(friendId, code) {
  const friend = friends.find(f => f.other_id === friendId);
  const result = await supabaseSendMatchInvite(session.currentUserId, friendId, code);
  showToast(result.success ? `Enviado para ${friend ? nameOf(friend) : 'seu amigo'}!` : 'Não foi possível enviar. Tente pelo link.', result.success ? 'success' : 'error');
}

function renderInbox(invites) {
  const box = document.getElementById('match-inbox');
  box.hidden = invites.length === 0;
  document.getElementById('match-inbox-list').replaceChildren(...invites.map(invite => {
    const item = document.createElement('li');
    item.className = 'friend-row';
    const text = document.createElement('span');
    text.className = 'friend-row__name';
    text.textContent = invite.payload.startsWith('ao-vivo:') ? `${invite.from_name} · ao vivo` : invite.from_name;
    const open = button('Abrir', 'matchInboxOpen', invite.id);
    open.dataset.payload = invite.payload;
    item.append(text, open, button('Apagar', 'matchInboxDelete', invite.id));
    return item;
  }));
}

export async function refreshInbox() {
  if (!hasAccount() || !available) {
    renderInbox([]);
    return;
  }
  const result = await supabaseListMatchInvites();
  invites = result.success ? result.invites : [];
  renderInbox(invites);
}

export async function matchInboxOpen(el) {
  await supabaseDeleteMatchInvite(el.dataset.arg);
  const url = new URL(location.href);
  const payload = el.dataset.payload;
  url.search = payload.startsWith('ao-vivo:') ? `?ao-vivo=${encodeURIComponent(payload.slice(8))}` : `?match=${payload}`;
  location.href = url.toString();
}

export async function matchInboxDelete(id) {
  await supabaseDeleteMatchInvite(id);
  await refreshInbox();
}
