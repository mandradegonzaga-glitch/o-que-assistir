// Match Mode: duas pessoas votam nos mesmos títulos. No mesmo celular (passando o aparelho),
// por link (uma de cada vez) ou ao vivo (cada uma no seu, ao mesmo tempo, via Supabase Realtime).
// Os votos ficam só na memória: não dependem de conta nem de banco.
import { getActiveModal } from '../ui/modals.js';
import { openLiveRoom } from '../api/supabase.js';
import { titleDetails } from '../api/tmdb.js';
import { isHorizontalSwipe } from '../domain/gestures.js';
import { createLiveState, liveReduce, makeRoomCode, normalizeRoomCode, parseLiveMessage } from '../domain/liveMatch.js';
import { MATCH_PARAMS, computeMatches, decodeMatchInvite, encodeMatchInvite, invitePayload, pickTitles, playerName } from '../domain/match.js';
import { session, state } from '../state/appState.js';
import { createConfetti, showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatRating } from '../utils/format.js';
import { discoverRequest, fetchRandomPage } from './filters.js';
import { sendInviteToFriend } from './friends.js';
import { recordMatch, renderMatchHistory } from './matchHistory.js';
import { grantXp, recordSocial, trackChallenge } from './progress.js';
import { carregarDetalhes } from './titleModal.js';
import { selecionarTipo, switchMode } from '../ui/navigation.js';
import { getYear, getTitle } from '../domain/mediaItem.js';
import { appLink, setUrlParams, shareLink } from '../ui/share.js';
import { registerActions } from '../ui/actions.js';
import { posterImg } from '../ui/icons.js';

let game = null; // { titles, type, names, votes: [Set, Set], player, index, mode: 'local' | 'invite' | 'guest' | 'answer' | 'live' }
let live = null; // { code, clientId, name, room, state, helloTimer, resyncTimer, giveUp }

const STEPS = ['match-setup', 'match-voting', 'match-pass', 'match-invite', 'match-joined', 'match-result',
  'match-live-lobby', 'match-live-join', 'match-live-wait'];
const { invite: INVITE_PARAM, live: LIVE_PARAM } = MATCH_PARAMS;
const HELLO_RETRY_MS = 2000;
const JOIN_TIMEOUT_MS = 15000;

function showStep(id) {
  STEPS.forEach(step => { document.getElementById(step).hidden = step !== id; });
}

function renderCard() {
  const title = game.titles[game.index];
  const name = getTitle(title);
  const year = getYear(title);

  document.getElementById('match-player').textContent = game.names[game.player];
  document.getElementById('match-counter').textContent = `${game.index + 1} de ${game.titles.length}`;
  document.getElementById('match-fill').style.width = `${(game.index / game.titles.length) * 100}%`;
  renderPartnerProgress();
  document.getElementById('match-card').innerHTML = `
    ${posterImg(title.poster_path, { cls: 'match-card__poster', lazy: false })}
    <div class="match-card__info">
      <h3 class="match-card__title">${escapeHtml(name)}</h3>
      <p class="match-card__meta">${escapeHtml(year)} · Nota ${formatRating(title.vote_average)}</p>
      <p class="match-card__overview">${escapeHtml(title.overview || 'Sem sinopse.')}</p>
    </div>`;
}

const matchStart = () => beginGame('local', 'btn-match-start');
const matchInvite = () => beginGame('invite', 'btn-match-invite');
const matchLive = () => beginGame('live', 'btn-match-live');

async function beginGame(mode, buttonId) {
  const btn = document.getElementById(buttonId);
  if (btn.disabled) return;
  btn.disabled = true;

  try {
    const usable = item => item.poster_path && !session.blacklist.includes(item.id);
    const titles = pickTitles(await fetchRandomPage(discoverRequest(), { min: 2, keep: usable }), session.blacklist);

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
    if (mode === 'live') {
      startHosting();
      return;
    }
    enterVoting({ focus: false });
  } catch (e) {
    console.error('Erro ao iniciar o Match:', e);
    showToast('Não foi possível carregar os títulos. Verifique a conexão e tente de novo.', 'error');
  } finally {
    btn.disabled = false;
  }
}

function matchVote(wanted) {
  if (!game || document.getElementById('match-voting').hidden) return;
  if (wanted) game.votes[game.player].add(game.titles[game.index].id);
  game.index++;
  if (game.mode === 'live') {
    live?.room.send({ event: 'progress', index: game.index });
    saveLive();
  }

  if (game.index < game.titles.length) {
    renderCard();
    return;
  }
  if (game.mode === 'live') {
    showLiveWait();
    handleLive({ event: 'self-done' });
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

function matchContinue() {
  enterVoting();
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
      const name = escapeHtml(getTitle(title));
      return `<button type="button" class="match-result-item" data-action="carregarDetalhes" data-id="${title.id}" data-media="${type}" aria-label="Abrir ${name}">
        ${posterImg(title.poster_path)}
        <span>${name}</span>
      </button>`;
    }).join('');
    createConfetti();
    grantXp('match');
    recordSocial('matches');
    trackChallenge('match');
    recordMatch({ partner: partnerLabel(), type: game.type, ids: matches.map(t => t.id) });
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

// Com quem foi a partida, do ponto de vista de quem está neste aparelho
function partnerLabel() {
  if (game.mode === 'local') return `${game.names[0]} e ${game.names[1]}`;
  if (game.mode === 'live') return game.names[partnerIndex()];
  return game.mode === 'guest' ? game.names[0] : game.names[1];
}

function votedIndexes(player) {
  return game.titles.map((title, i) => (game.votes[player].has(title.id) ? i : -1)).filter(i => i >= 0);
}

function inviteCode() {
  return encodeMatchInvite({
    type: game.type,
    ids: game.titles.map(t => t.id),
    nameA: game.names[0],
    votesA: votedIndexes(0),
    ...(game.mode === 'guest' ? { nameB: game.names[1], votesB: votedIndexes(1) } : {}),
  });
}

const inviteLink = () => appLink(INVITE_PARAM, inviteCode());

function showInviteStep() {
  document.getElementById('match-link').value = inviteLink();
  showStep('match-invite');
  document.getElementById('btn-match-send').focus();
}

const MATCH_SHARE_TITLE = 'Match no O Que Assistir?';

const inviteText = () => `${game.names[0]} quer decidir com você o que assistir. Vote nos títulos e veja o que deu match:`;

const matchSendInvite = () => shareLink(document.getElementById('match-link').value, inviteText(), MATCH_SHARE_TITLE);

const matchSendAnswer = () => shareLink(document.getElementById('match-answer-link').value, `${game.names[1]} respondeu ao seu Match. Veja o resultado:`, MATCH_SHARE_TITLE);

// Abre o programa de email da pessoa: não passa por servidor nenhum
function matchEmailInvite() {
  const to = document.getElementById('match-email').value.trim();
  const subject = encodeURIComponent(`${game.names[0]} te chamou para um Match`);
  const body = encodeURIComponent(`${inviteText()}\n\n${document.getElementById('match-link').value}`);
  const link = document.createElement('a');
  link.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  document.body.append(link);
  link.click();
  link.remove();
}

function matchSendToFriend(friendId) {
  if (live && game?.mode === 'live') {
    sendInviteToFriend(friendId, invitePayload({ code: live.code, live: true }));
    return;
  }
  sendInviteToFriend(friendId, invitePayload({ code: inviteCode() }));
}

function matchJoin() {
  game.names[1] = playerName(document.getElementById('match-joined-name').value, 1);
  enterVoting({ focus: false });
}

const hasInvite = () => [INVITE_PARAM, LIVE_PARAM].some(p => new URLSearchParams(location.search).has(p));
export { hasInvite as hasMatchInvite };

// Link recebido: convite para votar, ou resposta com o resultado pronto
export async function openMatchFromUrl() {
  const liveCode = new URLSearchParams(location.search).get(LIVE_PARAM);
  if (liveCode !== null) {
    switchMode('match');
    openLiveJoin(liveCode);
    return;
  }
  const code = new URLSearchParams(location.search).get(INVITE_PARAM);
  if (!code) return;

  switchMode('match');
  const invite = decodeMatchInvite(code);
  if (!invite) {
    showToast('Este link de Match não é válido. Peça um novo.', 'error');
    return;
  }

  try {
    const loaded = await Promise.all(invite.ids.map(id => titleDetails(invite.type, id).catch(() => null)));
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

function matchDraw() {
  const matches = game?.matches || [];
  if (matches.length === 0) return;
  const chosen = matches[Math.floor(Math.random() * matches.length)];
  carregarDetalhes(chosen.id, game.type);
}

function matchRestart() {
  if (live) clearLiveSession(live.code);
  closeLive();
  game = null;
  // O convite já cumpriu seu papel: sair do link evita abrir o mesmo jogo ao recarregar
  setUrlParams({ [INVITE_PARAM]: null, [LIVE_PARAM]: null });
  showStep('match-setup');
  renderMatchHistory();
}

// ================================================
// MATCH AO VIVO
// Quem cria abre a sala e manda o link ou o código. Quem entra diz "oi"; a sala responde com os
// títulos. Cada um vota no seu aparelho, vendo só até onde o outro chegou. Os votos só são
// trocados quando os dois terminam (regras em src/domain/liveMatch.js).
// ================================================

const selfIndex = () => (live?.state.role === 'guest' ? 1 : 0);
const partnerIndex = () => 1 - selfIndex();
const liveLink = code => appLink(LIVE_PARAM, code);
const partnerName = () => live?.state.partnerName || (selfIndex() === 0 ? 'a outra pessoa' : 'quem te chamou');

// O mesmo aparelho volta com o mesmo id ao recarregar: a sala reconhece e manda os títulos de novo
const clientKey = code => `match-ao-vivo:${code}`;

function clientIdFor(code) {
  const key = clientKey(code);
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) return saved;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

// Mostra o primeiro título a votar; com o teclado, o foco já fica no "Sim"
function enterVoting({ focus = true } = {}) {
  showStep('match-voting');
  renderCard();
  if (focus) document.querySelector('[data-action="matchYes"]').focus();
}

// Não deu para entrar na sala: fecha, libera o botão e explica
function failLiveJoin(message) {
  closeLive();
  setJoinBusy(false);
  setText('match-live-join-status', '');
  showToast(message, 'error');
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

// Sala salva na aba: recarregar a página (ou o celular descartar a aba em segundo plano) retoma
// a partida em vez de acabar com ela. Fechar a aba apaga, como todo sessionStorage.
const sessionKey = code => `match-ao-vivo-sala:${code}`;
const TITLE_FIELDS = ['id', 'title', 'name', 'poster_path', 'overview', 'vote_average', 'release_date', 'first_air_date'];
const pickTitle = title => Object.fromEntries(TITLE_FIELDS.map(key => [key, title[key]]));

function saveLive() {
  if (!live || game?.mode !== 'live') return;
  const snapshot = {
    role: live.state.role,
    name: live.name,
    state: live.state,
    game: { type: game.type, names: game.names, index: game.index, titles: game.titles.map(pickTitle), selfVotes: votedIndexes(selfIndex()) },
  };
  try { sessionStorage.setItem(sessionKey(live.code), JSON.stringify(snapshot)); } catch { /* sem espaço: segue sem retomar */ }
}

function loadLive(code) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(sessionKey(code)));
    const titles = saved?.game?.titles;
    const valid = ['host', 'guest'].includes(saved?.role) && saved.state && Array.isArray(titles) && titles.length >= 2
      && titles.every(t => Number.isInteger(t?.id)) && Number.isInteger(saved.game.index)
      && Array.isArray(saved.game.selfVotes) && saved.game.selfVotes.every(i => Number.isInteger(i) && i >= 0 && i < titles.length);
    return valid ? saved : null;
  } catch {
    return null;
  }
}

function clearLiveSession(code) {
  try {
    sessionStorage.removeItem(sessionKey(code));
    sessionStorage.removeItem(clientKey(code));
  } catch { /* nada a apagar */ }
}

function resumeLive(code, saved) {
  const { titles, names, type, index, selfVotes } = saved.game;
  const self = saved.role === 'guest' ? 1 : 0;
  game = { mode: 'live', type, titles, names, votes: [new Set(), new Set()], player: self, index: Math.min(index, titles.length) };
  game.votes[self] = new Set(selfVotes.map(i => titles[i].id));
  if (saved.role === 'guest') selecionarTipo(type);
  connectLive(code, saved.role, saved.name, saved.state);

  if (!live.state.partnerId) {
    showLobby(code);
  } else if (live.state.selfDone) {
    showLiveWait();
  } else {
    enterVoting();
  }
  showToast('Match ao vivo retomado.');
}

function stopJoinTimers() {
  if (!live) return;
  clearInterval(live.helloTimer);
  clearTimeout(live.resyncTimer);
  clearTimeout(live.giveUp);
}

function closeLive() {
  if (!live) return;
  stopJoinTimers();
  const { room, state } = live;
  live = null;
  if (!state.finished) room.send({ event: 'bye' });
  room.close();
}

function connectLive(code, role, name, savedState) {
  closeLive();
  const clientId = clientIdFor(code);
  const state = savedState ? { ...createLiveState(role, clientId), ...savedState, role, selfId: clientId } : createLiveState(role, clientId);
  live = { code, clientId, name, state };
  const current = live;
  live.room = openLiveRoom(code, clientId, {
    onMessage: raw => { if (live === current) handleLive(parseLiveMessage(raw, game?.titles.length || 0)); },
    onLeave: key => { if (live === current && key === live.state.partnerId) handleLive({ event: 'bye', from: key }); },
    onStatus: status => { if (live === current) onLiveStatus(status); },
  });
}

function onLiveStatus(status) {
  const host = live.state.role === 'host';
  if (status === 'error') {
    closeLive();
    showToast('Não foi possível abrir o Match ao vivo. Verifique a conexão ou use o convite por link.', 'error');
    if (host) showStep('match-setup');
    else setText('match-live-join-status', '');
    setJoinBusy(false);
    return;
  }
  if (live.state.partnerId) {
    // Voltou depois de recarregar: pede ao outro até onde ele chegou (uma segunda vez, se a primeira se perder)
    const resync = () => live?.room.send({ event: 'resync' });
    resync();
    live.resyncTimer = setTimeout(resync, HELLO_RETRY_MS);
    return;
  }
  if (host) {
    setText('match-live-status', 'Esperando alguém entrar…');
    return;
  }
  // Quem entra repete o "oi" até a sala responder: a primeira mensagem pode se perder
  const hello = () => live?.room.send({ event: 'hello', name: live.name });
  hello();
  live.helloTimer = setInterval(hello, HELLO_RETRY_MS);
  live.giveUp = setTimeout(() => {
    failLiveJoin('Não encontramos esse Match. Ele pode ter terminado: peça um novo link.');
  }, JOIN_TIMEOUT_MS);
}

function handleLive(msg) {
  if (!msg || !live) return;
  const { state, actions } = liveReduce(live.state, msg);
  live.state = state;
  actions.forEach(action => runLiveAction(action, msg));
  saveLive();
}

function runLiveAction(action, msg) {
  if (action.send === 'start') {
    game.names[1] = live.state.partnerName;
    live.room.send({ event: 'start', to: action.to, type: game.type, ids: game.titles.map(t => t.id), names: [game.names[0], live.state.partnerName] });
  } else if (action.send === 'full') {
    live.room.send({ event: 'full', to: action.to });
  } else if (action.send === 'progress') {
    live.room.send({ event: 'progress', index: game?.index || 0 });
  } else if (action.send === 'done') {
    live.room.send({ event: 'done' });
  } else if (action.send === 'votes') {
    live.room.send({ event: 'votes', votes: votedIndexes(selfIndex()) });
  } else if (action === 'partner-joined') {
    showToast(`${live.state.partnerName} entrou! Podem votar.`);
    game.player = 0;
    game.index = 0;
    enterVoting();
  } else if (action === 'start') {
    guestStart(msg);
  } else if (action === 'full') {
    failLiveJoin('Este Match já tem duas pessoas. Peça um novo link.');
  } else if (action === 'progress') {
    renderPartnerProgress();
  } else if (action === 'finish') {
    finishLive();
  } else if (action === 'partner-back') {
    showToast(`${partnerName()} voltou!`);
    if (!document.getElementById('match-live-wait').hidden) setText('match-live-wait-progress', '');
    renderPartnerProgress();
  } else if (action === 'partner-left') {
    const text = `${partnerName()} saiu do Match.`;
    showToast(text, 'warning');
    setText('match-live-wait-progress', `${text} Comecem outro quando quiserem.`);
    setText('match-partner', text);
  }
}

function renderPartnerProgress() {
  const line = document.getElementById('match-partner');
  const inGame = live && game?.mode === 'live' && live.state.partnerId;
  line.hidden = !inGame;
  if (!inGame) return;
  const { partnerDone, partnerProgress, left } = live.state;
  const total = game.titles.length;
  const text = left ? `${partnerName()} saiu do Match.`
    : partnerDone ? `${partnerName()} já terminou`
      : `${partnerName()} está no ${Math.min(partnerProgress + 1, total)} de ${total}`;
  line.textContent = text;
  if (!document.getElementById('match-live-wait').hidden && !left) {
    setText('match-live-wait-progress', partnerDone ? 'Juntando os votos…' : text);
  }
}

function showLobby(code) {
  setText('match-live-code', code);
  setText('match-live-code-sr', `Código ${code.split('').join(' ')}`); // letra por letra para quem ouve
  document.getElementById('match-live-link').value = liveLink(code);
  setText('match-live-status', 'Abrindo a sala…');
  showStep('match-live-lobby');
  document.getElementById('btn-match-live-send').focus();
}

function startHosting() {
  const code = makeRoomCode();
  game.names[1] = 'Pessoa 2';
  connectLive(code, 'host', game.names[0]);
  // O código no endereço é o que permite retomar a sala depois de recarregar
  setUrlParams({ [LIVE_PARAM]: code });
  saveLive();
  showLobby(code);
}

const liveInviteText = () => `${game.names[0]} quer escolher com você o que assistir, ao vivo. Entre e vote junto (código ${live.code}):`;

function matchLiveSend() {
  if (!live) return;
  shareLink(liveLink(live.code), liveInviteText(), MATCH_SHARE_TITLE);
}

function openLiveJoin(rawCode) {
  const code = normalizeRoomCode(rawCode);
  if (!code) {
    showToast('Este link de Match ao vivo não é válido. Peça um novo.', 'error');
    return;
  }
  const saved = loadLive(code);
  if (saved) {
    resumeLive(code, saved);
    return;
  }
  closeLive();
  game = null;
  pendingCode = code;
  setText('match-live-join-code', code);
  setText('match-live-join-status', '');
  setJoinBusy(false);
  showStep('match-live-join');
  document.getElementById('match-live-name').focus();
}

let pendingCode = null;

// Código digitado na tela inicial do Match: vale o mesmo que abrir o link
function matchCodeJoin() {
  const input = document.getElementById('match-code-input');
  const code = normalizeRoomCode(input.value);
  if (!code) {
    showToast('Código inválido: são 6 letras e números, como K7P2QX.', 'error');
    input.focus();
    return;
  }
  setUrlParams({ [LIVE_PARAM]: code });
  input.value = '';
  openLiveJoin(code);
}

function setJoinBusy(busy) {
  const button = document.getElementById('btn-match-live-join');
  if (busy) {
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'true');
  } else {
    button.removeAttribute('aria-disabled');
    button.removeAttribute('aria-busy');
  }
}

function matchLiveJoin() {
  const button = document.getElementById('btn-match-live-join');
  if (!pendingCode || button.getAttribute('aria-disabled') === 'true') return;
  setJoinBusy(true);
  setText('match-live-join-status', 'Entrando…');
  connectLive(pendingCode, 'guest', playerName(document.getElementById('match-live-name').value, 1));
}

async function guestStart(msg) {
  stopJoinTimers();
  setText('match-live-join-status', 'Carregando os títulos…');
  try {
    const titles = await Promise.all(msg.ids.map(id => titleDetails(msg.type, id)));
    // Os votos são posições na lista: um título faltando desalinharia os dois lados
    if (titles.some(t => !t?.poster_path)) throw new Error('título sem pôster');
    if (!live) return; // saiu enquanto carregava
    selecionarTipo(msg.type);
    game = { mode: 'live', type: msg.type, titles, names: [msg.names[0], live.name], votes: [new Set(), new Set()], player: 1, index: 0 };
    saveLive();
    setJoinBusy(false);
    enterVoting();
  } catch (e) {
    console.error('Erro ao carregar o Match ao vivo:', e);
    failLiveJoin('Não foi possível carregar os títulos deste Match. Tente entrar de novo.');
  }
}

function showLiveWait() {
  setText('match-live-wait-title', `Pronto! Esperando ${partnerName()} terminar`);
  showStep('match-live-wait');
  renderPartnerProgress();
  document.getElementById('match-live-wait-title').focus();
}

function finishLive() {
  const ids = live.state.partnerVotes.map(i => game.titles[i].id);
  game.votes[partnerIndex()] = new Set(ids);
  game.names[partnerIndex()] = partnerName();
  clearLiveSession(live.code); // acabou: recarregar não reabre esta partida
  setUrlParams({ [LIVE_PARAM]: null });
  showResult();
  // Fecha depois de um respiro: a outra pessoa ainda pode estar recebendo os votos daqui
  const done = live;
  setTimeout(() => { if (live === done) closeLive(); }, 3000);
}

window.addEventListener('pagehide', () => {
  if (live && !live.state.finished) live.room.send({ event: 'bye' });
});

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
    if (e.target.closest('input, select, textarea') || getActiveModal()) return;
    if (e.key === 'ArrowRight') matchVote(true);
    if (e.key === 'ArrowLeft') matchVote(false);
  });
}

registerActions({
  click: {
    friendSendMatch: el => matchSendToFriend(el.dataset.arg),
    matchContinue,
    matchDraw,
    matchEmailInvite,
    matchInvite,
    matchJoin,
    matchCodeJoin,
    matchLive,
    matchLiveJoin,
    matchLiveSend,
    matchSendAnswer,
    matchSendInvite,
    matchNo: () => matchVote(false),
    matchRestart,
    matchStart,
    matchYes: () => matchVote(true),
  },
  enter: {
    matchCodeJoin,
    matchLiveJoin,
  },
});
