// Amigos e convites de Match dentro do app. Exige conta e as tabelas de database/friends.sql:
// sem elas, as seções ficam ocultas e o Match por link continua funcionando.
import {
  supabaseAcceptFriend, supabaseDeleteMatchInvite, supabaseFindUser, supabaseGetFriendProfile, supabaseListFriends, supabaseListMatchInvites,
  supabaseRemoveFriend, supabaseRequestFriend, supabaseSendMatchInvite, supabaseUpdateProfile,
} from '../api/supabase.js';
import { IMG_URL } from '../config/constants.js';
import { BADGE_DEFINITIONS } from '../domain/badges.js';
import { session } from '../state/appState.js';
import { BADGE_ICONS } from '../ui/badgeIcons.js';
import { switchMode } from '../ui/navigation.js';
import { formatCount } from '../utils/format.js';
import { shareLink } from './match.js';
import { showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';

const FRIEND_PARAM = 'amigo';

let friends = [];
let available = false;
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
  const badge = document.getElementById('friends-badge');
  badge.textContent = received.length;
  badge.hidden = received.length === 0;
  badge.setAttribute('aria-label', `${received.length} pedidos de amizade`);

  if (account && available) {
    document.getElementById('my-username').textContent = session.userProfile?.username ? `@${session.userProfile.username}` : '';

    document.getElementById('friends-share').checked = session.userProfile?.share_with_friends !== false;

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

// "Enviar para" nas telas de convite e de resultado do Match
function renderFriendTargets() {
  document.querySelectorAll('[data-friend-targets]').forEach(box => {
    const list = box.querySelector('.friend-targets');
    list.replaceChildren(...accepted().map(f => button(nameOf(f), 'friendSendMatch', f.other_id, 'btn-outline friend-target')));
    box.hidden = !hasAccount() || !available || accepted().length === 0;
  });
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

export async function refreshFriends() {
  if (!hasAccount()) {
    friends = [];
    available = false;
    renderFriends();
    renderInbox([]);
    return;
  }
  const result = await supabaseListFriends(session.currentUserId);
  available = result.success;
  friends = result.friends || [];
  renderFriends();
  await refreshInbox();
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
    text.textContent = invite.from_name;
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
  renderInbox(result.success ? result.invites : []);
}

export async function matchInboxOpen(el) {
  await supabaseDeleteMatchInvite(el.dataset.arg);
  const url = new URL(location.href);
  url.search = `?match=${el.dataset.payload}`;
  location.href = url.toString();
}

export async function matchInboxDelete(id) {
  await supabaseDeleteMatchInvite(id);
  await refreshInbox();
}
