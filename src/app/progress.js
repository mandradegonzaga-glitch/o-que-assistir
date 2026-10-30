// Sequência e XP. Conta: metadados do usuário (sincroniza entre aparelhos, sem mudar o banco).
// Convidado: neste aparelho.
import { supabaseUpdateUserData } from '../api/supabase.js';
import { EMPTY_PROGRESS, XP_LABELS, addXp, applyDailyVisit, getLevel, normalizeProgress } from '../domain/progress.js';
import { session } from '../state/appState.js';
import { showAchievement, showToast } from '../ui/feedback.js';
import { formatCount, pluralize } from '../utils/format.js';
import { storage } from '../utils/storage.js';
import { checkAllBadges } from './profile.js';

const GUEST_KEY = 'guest_progress';
let loadedFor = null;

function isAccount() {
  return Boolean(session.currentUserId) && session.currentUser !== 'guest';
}

function save() {
  if (isAccount()) {
    // Mantém a cópia em memória igual ao que foi gravado
    session.currentUser.user_metadata = { ...session.currentUser.user_metadata, progress: session.progress };
    supabaseUpdateUserData({ progress: session.progress });
  }
  else storage.set(GUEST_KEY, session.progress);
}

function celebrateLevel(before) {
  const level = getLevel(session.progress.xp);
  if (level.index > getLevel(before).index) {
    showAchievement({ name: `Nível ${level.name}`, desc: 'Você subiu de nível!', icon: 'film', kicker: 'Novo nível' });
  }
}

export function loadProgress() {
  // O Supabase avisa de novo o login ao voltar para a aba, com dados possivelmente antigos
  const owner = isAccount() ? session.currentUserId : 'guest';
  if (owner === loadedFor) return;
  loadedFor = owner;
  session.progress = isAccount()
    ? normalizeProgress(session.currentUser?.user_metadata?.progress)
    : normalizeProgress(storage.get(GUEST_KEY, EMPTY_PROGRESS));
}

// Chamado ao entrar: conta a visita uma vez por dia
export async function registerDailyVisit() {
  if (!session.currentUser) return;
  loadProgress();
  const updated = applyDailyVisit(session.progress);
  if (!updated) return;

  const before = session.progress.xp;
  session.progress = updated;
  save();
  celebrateLevel(before);
  if (updated.streak > 1) showToast(`Sequência de ${formatCount(updated.streak)} dias! +5 XP`);
  await checkAllBadges();
}

export function grantXp(action) {
  if (!session.currentUser) return;
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
}
