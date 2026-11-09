// Sequência e XP. Conta: metadados do usuário (sincroniza entre aparelhos, sem mudar o banco).
// Convidado: neste aparelho.
import { readAccountData, writeAccountData } from './accountData.js';
import { applyChallengeEvent, currentChallenges } from '../domain/challenges.js';
import { EMPTY_PROGRESS, XP_LABELS, addXp, applyDailyVisit, bumpSocial, getLevel, mergeProgress, normalizeProgress } from '../domain/progress.js';
import { getGuestProgress, saveGuestProgress } from './guestLibrary.js';
import { isAccount, session } from '../state/appState.js';
import { showAchievement, showToast } from '../ui/feedback.js';
import { formatCount, pluralize } from '../utils/format.js';
import { checkAllBadges } from './badges.js';
import { localDay } from '../utils/date.js';
import { emit, on } from '../state/events.js';

let loadedFor = null;


function save() {
  if (isAccount()) {
    writeAccountData({ progress: session.progress });
  }
  else saveGuestProgress(session.progress);
}

function celebrateLevel(before) {
  const level = getLevel(session.progress.xp);
  if (level.index > getLevel(before).index) {
    showAchievement({ name: `Nível ${level.name}`, desc: 'Você subiu de nível!', icon: 'film', kicker: 'Novo nível' });
  }
}

function loadProgress() {
  // O Supabase avisa de novo o login ao voltar para a aba, com dados possivelmente antigos
  const owner = isAccount() ? session.currentUserId : 'guest';
  if (owner === loadedFor) return;
  loadedFor = owner;
  session.progress = isAccount()
    ? normalizeProgress(readAccountData('progress'))
    : normalizeProgress(getGuestProgress() ?? EMPTY_PROGRESS);
}

// Quem era convidado e criou conta leva o XP e os recordes junto (legacyImport.js)
export function adoptGuestProgress() {
  const guest = getGuestProgress();
  if (!guest || !isAccount()) return;
  loadProgress();
  session.progress = mergeProgress(session.progress, guest);
  save();
}

// Chamado ao entrar: conta a visita uma vez por dia
on('session:started', registerDailyVisit);
on('session:ended', () => { loadedFor = null; });

async function registerDailyVisit() {
  if (!session.currentUser) return;
  loadProgress();
  const updated = applyDailyVisit(session.progress);
  if (!updated) return;

  const before = session.progress.xp;
  session.progress = updated;
  save();
  celebrateLevel(before);
  const { daily } = currentChallenges(updated.challenges, localDay(), { guest: !isAccount() });
  const streakNote = updated.streak > 1 ? `Sequência de ${formatCount(updated.streak)} dias! +5 XP · ` : '';
  showToast(`${streakNote}Desafio de hoje: ${daily.text}`);
  await checkAllBadges();
}

// Avisos do app para o desafio do dia e a meta da semana. Grava só quando o andamento muda.
// event: watched, saved, opened, roulette, match, ticket, shared. detail: o título, quando houver.
on('title:opened', ({ item }) => trackChallenge('opened', item));

export function trackChallenge(event, detail) {
  if (!session.currentUser) return;
  loadProgress();
  const guest = !isAccount();
  const result = applyChallengeEvent(session.progress.challenges, event, detail, localDay(), { guest });
  if (!result) return;
  const before = session.progress.xp;
  let next = { ...session.progress, challenges: result.challenges };
  result.completed.forEach(kind => { next = addXp(next, kind); });
  session.progress = next;
  save();
  const view = currentChallenges(next.challenges, localDay(), { guest });
  // Um aviso só, mesmo quando o desafio e a meta terminam juntos
  if (result.completed.length) {
    const done = result.completed.map(kind => view[kind]);
    const xp = done.reduce((sum, c) => sum + c.xp, 0);
    const kicker = done.length === 2 ? 'Desafio do dia e meta da semana' : (result.completed[0] === 'daily' ? 'Desafio do dia concluído' : 'Meta da semana concluída');
    showAchievement({ name: done.map(c => c.text).join(' · '), desc: `+${formatCount(xp)} XP`, icon: done[0].icon, kicker });
  }
  celebrateLevel(before);
  emit('progress:changed');
}

// Contadores das conquistas sociais (amigos, indicações, ingressos, matches). Grava só se mudou.
export async function recordSocial(key, value) {
  if (!session.currentUser) return;
  loadProgress();
  const updated = bumpSocial(session.progress, key, value);
  if (!updated) return;
  session.progress = updated;
  save();
  await checkAllBadges();
}

export function grantXp(action) {
  if (!session.currentUser) return;
  loadProgress();
  const before = session.progress.xp;
  session.progress = addXp(session.progress, action);
  save();
  celebrateLevel(before);
}

export function renderProgress() {
  const { xp, streak, bestStreak, log } = session.progress;
  const level = getLevel(xp);
  const dayWord = n => pluralize(n, 'dia', 'dias');

  document.getElementById('streak-current').textContent = `${formatCount(streak)} ${dayWord(streak)}`;
  document.getElementById('streak-best').textContent = `Recorde: ${formatCount(bestStreak)} ${dayWord(bestStreak)}`;
  document.getElementById('level-name').textContent = level.name;
  document.getElementById('level-xp').textContent = level.next
    ? `${formatCount(xp)} XP · faltam ${formatCount(level.missing)} para ${level.next.name}`
    : `${formatCount(xp)} XP · nível máximo`;

  const bar = document.getElementById('level-bar');
  bar.setAttribute('aria-valuenow', level.percent);
  document.getElementById('level-fill').style.width = `${level.percent}%`;

  const logBox = document.getElementById('xp-log');
  logBox.replaceChildren(...log.map(({ action, amount }) => {
    const item = document.createElement('li');
    item.textContent = `+${amount} XP · ${XP_LABELS[action] || action}`;
    return item;
  }));
  logBox.hidden = log.length === 0;

  renderChallenges();
}

function renderChallenges() {
  const view = currentChallenges(session.progress.challenges, localDay(), { guest: !isAccount() });
  ['daily', 'weekly'].forEach(kind => {
    const c = view[kind];
    const box = document.getElementById(`challenge-${kind}`);
    if (!box) return;
    box.classList.toggle('done', c.done);
    box.querySelector('.challenge__text').textContent = c.text;
    box.querySelector('.challenge__status').textContent = c.done
      ? `Concluído · +${formatCount(c.xp)} XP`
      : `${formatCount(c.count)} de ${formatCount(c.goal)} · vale ${formatCount(c.xp)} XP`;
    const bar = box.querySelector('[role="progressbar"]');
    bar.setAttribute('aria-valuemax', c.goal);
    bar.setAttribute('aria-valuenow', c.count);
    box.querySelector('.badges-progress__fill').style.width = `${(c.count / c.goal) * 100}%`;
  });
}
