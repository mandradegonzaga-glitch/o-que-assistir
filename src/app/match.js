// Match Mode no mesmo celular: duas pessoas votam nos mesmos títulos, passando o aparelho.
// Os votos ficam só na memória: não dependem de conta nem de banco.
import { tmdbFetch, tmdbGet } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { buildDiscoverUrl, getRandomPage } from '../domain/filters.js';
import { isHorizontalSwipe } from '../domain/gestures.js';
import { computeMatches, decodeMatchInvite, encodeMatchInvite, pickTitles, playerName } from '../domain/match.js';
import { session, state } from '../state/appState.js';
import { createConfetti, showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatRating } from '../utils/format.js';
import { getFilterOptions } from './discover.js';
import { sendInviteToFriend } from './friends.js';
import { grantXp } from './progress.js';
import { carregarDetalhes } from './titleModal.js';
import { selecionarTipo, switchMode } from '../ui/navigation.js';

let game = null; // { titles, type, names, votes: [Set, Set], player, index, mode: 'local' | 'invite' | 'guest' }

const STEPS = ['match-setup', 'match-voting', 'match-pass', 'match-invite', 'match-joined', 'match-result'];
const INVITE_PARAM = 'match';

function showStep(id) {
  STEPS.forEach(step => { document.getElementById(step).hidden = step !== id; });
}

function renderCard() {
  const title = game.titles[game.index];
  const name = title.title || title.name;
  const year = (title.release_date || title.first_air_date || '').split('-')[0];

  document.getElementById('match-player').textContent = game.names[game.player];
  document.getElementById('match-counter').textContent = `${game.index + 1} de ${game.titles.length}`;
  document.getElementById('match-fill').style.width = `${(game.index / game.titles.length) * 100}%`;
  document.getElementById('match-card').innerHTML = `
    <img class="match-card__poster" src="${IMG_URL + title.poster_path}" alt="" width="500" height="750">
    <div class="match-card__info">
      <h3 class="match-card__title">${escapeHtml(name)}</h3>
      <p class="match-card__meta">${escapeHtml(year)} · Nota ${formatRating(title.vote_average)}</p>
      <p class="match-card__overview">${escapeHtml(title.overview || 'Sem sinopse.')}</p>
    </div>`;
}

export const matchStart = () => beginGame('local', 'btn-match-start');
export const matchInvite = () => beginGame('invite', 'btn-match-invite');

async function beginGame(mode, buttonId) {
  const btn = document.getElementById(buttonId);
  if (btn.disabled) return;
  btn.disabled = true;

  try {
    const endpoint = state.type === 'dorama' ? 'tv' : state.type;
    const url = buildDiscoverUrl(endpoint, { ...getFilterOptions(), isDorama: state.type === 'dorama' });
    const data = await tmdbFetch(`${url}&page=${getRandomPage()}`);
    const titles = pickTitles(data.results || [], session.blacklist);

    if (titles.length < 2) {
      showToast('Poucos títulos com esses filtros. Tente mudar os filtros em Descobrir.', 'error');
      return;
    }

    game = {
      mode,
      type: state.type,
      titles,
      names: [0, 1].map(i => playerName(document.getElementById(`match-name-${i + 1}`).value, i)),
      votes: [new Set(), new Set()],
      player: 0,
      index: 0,
    };
    showStep('match-voting');
    renderCard();
  } catch (e) {
    console.error('Erro ao iniciar o Match:', e);
    showToast('Não foi possível carregar os títulos. Verifique a conexão e tente de novo.', 'error');
  } finally {
    btn.disabled = false;
  }
}

export function matchVote(wanted) {
  if (!game || document.getElementById('match-voting').hidden) return;
  if (wanted) game.votes[game.player].add(game.titles[game.index].id);
  game.index++;

  if (game.index < game.titles.length) {
    renderCard();
    return;
  }
  if (game.mode === 'invite') {
    showInviteStep();
    return;
  }
  if (game.player === 0) {
    game.player = 1;
    game.index = 0;
    document.getElementById('match-pass-name').textContent = game.names[1];
    showStep('match-pass');
    document.getElementById('btn-match-continue').focus();
    return;
  }
  showResult();
}

export function matchContinue() {
  showStep('match-voting');
  renderCard();
  document.querySelector('[data-action="matchYes"]').focus();
}

function showResult() {
  const matches = computeMatches(game.titles, game.votes[0], game.votes[1]);
  game.matches = matches;
  showStep('match-result');
  const heading = document.getElementById('match-result-title');
  const list = document.getElementById('match-result-list');
  document.getElementById('btn-match-draw').hidden = matches.length < 2;

  if (matches.length === 0) {
    heading.textContent = 'Nenhum título em comum';
    list.innerHTML = '<p class="section-note">Vocês não coincidiram desta vez. Tente com outros títulos.</p>';
  } else {
    heading.textContent = matches.length === 1 ? 'Deu match!' : `${matches.length} matches!`;
    const type = game.type;
    list.innerHTML = matches.map(title => {
      const name = escapeHtml(title.title || title.name);
      return `<button type="button" class="match-result-item" data-action="carregarDetalhes" data-id="${title.id}" data-media="${type}" aria-label="Abrir ${name}">
        <img src="${IMG_URL + title.poster_path}" alt="" width="500" height="750" loading="lazy">
        <span>${name}</span>
      </button>`;
    }).join('');
    createConfetti();
    grantXp('match');
  }
  // Quem respondeu a um convite devolve o resultado para quem chamou
  const answer = document.getElementById('match-answer');
  answer.hidden = game.mode !== 'guest';
  if (game.mode === 'guest') {
    document.getElementById('match-answer-name').textContent = game.names[0];
    document.getElementById('match-answer-link').value = inviteLink();
  }
  heading.focus();
}

function votedIndexes(player) {
  return game.titles.map((title, i) => (game.votes[player].has(title.id) ? i : -1)).filter(i => i >= 0);
}

function inviteLink() {
  const code = encodeMatchInvite({
    type: game.type,
    ids: game.titles.map(t => t.id),
    nameA: game.names[0],
    votesA: votedIndexes(0),
    ...(game.mode === 'guest' ? { nameB: game.names[1], votesB: votedIndexes(1) } : {}),
  });
  return `${location.origin}${location.pathname}?${INVITE_PARAM}=${code}`;
}

function showInviteStep() {
  document.getElementById('match-link').value = inviteLink();
  showStep('match-invite');
  document.getElementById('btn-match-send').focus();
}

export async function shareLink(url, text) {
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && navigator.share) {
    try {
      await navigator.share({ title: 'Match no O Que Assistir?', text, url });
    } catch (e) {
      if (e.name !== 'AbortError') showToast('Não foi possível abrir o compartilhar. Copie o link.', 'error');
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast('Link copiado! Cole na conversa.');
  } catch {
    showToast('Não foi possível copiar. Selecione o link e copie.', 'error');
  }
}

const inviteText = () => `${game.names[0]} quer decidir com você o que assistir. Vote nos títulos e veja o que deu match:`;

export const matchSendInvite = () => shareLink(document.getElementById('match-link').value, inviteText());

export const matchSendAnswer = () => shareLink(document.getElementById('match-answer-link').value, `${game.names[1]} respondeu ao seu Match. Veja o resultado:`);

// Abre o programa de email da pessoa: não passa por servidor nenhum
export function matchEmailInvite() {
  const to = document.getElementById('match-email').value.trim();
  const subject = encodeURIComponent(`${game.names[0]} te chamou para um Match`);
  const body = encodeURIComponent(`${inviteText()}\n\n${document.getElementById('match-link').value}`);
  const link = document.createElement('a');
  link.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  document.body.append(link);
  link.click();
  link.remove();
}

export function matchSendToFriend(friendId) {
  const link = game.mode === 'guest' ? document.getElementById('match-answer-link').value : document.getElementById('match-link').value;
  sendInviteToFriend(friendId, new URL(link).searchParams.get(INVITE_PARAM));
}

export function matchJoin() {
  game.names[1] = playerName(document.getElementById('match-joined-name').value, 1);
  showStep('match-voting');
  renderCard();
}

const hasInvite = () => new URLSearchParams(location.search).has(INVITE_PARAM);
export { hasInvite as hasMatchInvite };

// Link recebido: convite para votar, ou resposta com o resultado pronto
export async function openMatchFromUrl() {
  const code = new URLSearchParams(location.search).get(INVITE_PARAM);
  if (!code) return;

  switchMode('match');
  const invite = decodeMatchInvite(code);
  if (!invite) {
    showToast('Este link de Match não é válido. Peça um novo.', 'error');
    return;
  }

  try {
    const endpoint = invite.type === 'dorama' ? 'tv' : invite.type;
    const loaded = await Promise.all(invite.ids.map(id => tmdbGet(`/${endpoint}/${id}`).catch(() => null)));
    const titles = invite.ids.map((id, i) => ({ id, data: loaded[i] })).filter(x => x.data?.poster_path);
    if (titles.length < 2) throw new Error('títulos indisponíveis');

    const votes = list => new Set((list || []).map(i => invite.ids[i]));
    selecionarTipo(invite.type);
    game = {
      mode: 'guest',
      type: invite.type,
      titles: titles.map(x => x.data),
      names: [invite.nameA, invite.nameB || 'Pessoa 2'],
      votes: [votes(invite.votesA), votes(invite.votesB)],
      player: 1,
      index: 0,
    };

    if (invite.votesB) {
      game.mode = 'answer';
      showResult();
      return;
    }
    document.getElementById('match-joined-from').textContent = invite.nameA;
    showStep('match-joined');
  } catch (e) {
    console.error('Erro ao abrir o Match:', e);
    showToast('Não foi possível carregar este Match. Tente abrir o link de novo.', 'error');
  }
}

export function matchDraw() {
  const matches = game?.matches || [];
  if (matches.length === 0) return;
  const chosen = matches[Math.floor(Math.random() * matches.length)];
  carregarDetalhes(chosen.id, game.type);
}

export function matchRestart() {
  game = null;
  // O convite já cumpriu seu papel: sair do link evita abrir o mesmo jogo ao recarregar
  const url = new URL(location.href);
  url.searchParams.delete(INVITE_PARAM);
  history.replaceState(null, '', url);
  showStep('match-setup');
}

export function initMatch() {
  const card = document.getElementById('match-card');
  let start = null;
  card.addEventListener('touchstart', (e) => {
    const { screenX, screenY } = e.changedTouches[0];
    start = { x: screenX, y: screenY };
  }, { passive: true });
  card.addEventListener('touchend', (e) => {
    if (!start) return;
    const { screenX, screenY } = e.changedTouches[0];
    const deltaX = screenX - start.x;
    const deltaY = screenY - start.y;
    start = null;
    if (isHorizontalSwipe(deltaX, deltaY)) matchVote(deltaX > 0);
  });

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('match-voting').hidden || document.getElementById('view-match').style.display !== 'block') return;
    if (e.target.closest('input, select, textarea') || document.querySelector('.modal-overlay[style*="flex"]')) return;
    if (e.key === 'ArrowRight') matchVote(true);
    if (e.key === 'ArrowLeft') matchVote(false);
  });
}
