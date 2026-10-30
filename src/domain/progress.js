// Sequência de dias e XP. Lógica pura: quem grava é src/app/progress.js.
export const XP_REWARDS = { open: 5, watched: 20, roulette: 10, match: 15 };

export const XP_LABELS = { open: 'Visita do dia', watched: 'Título assistido', roulette: 'Giro da roleta', match: 'Match' };

export const LEVELS = [
  { name: 'Calouro', minXp: 0 },
  { name: 'Aprendiz', minXp: 100 },
  { name: 'Cinéfilo', minXp: 300 },
  { name: 'Crítico', minXp: 700 },
  { name: 'Maratonista', minXp: 1500 },
  { name: 'Lenda', minXp: 3000 },
];

const LOG_SIZE = 5;

export const EMPTY_PROGRESS = { xp: 0, streak: 0, bestStreak: 0, lastVisit: null, log: [] };

export function normalizeProgress(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const count = value => (Number.isInteger(value) && value >= 0 ? value : 0);
  return {
    xp: count(p.xp),
    streak: count(p.streak),
    bestStreak: count(p.bestStreak),
    lastVisit: typeof p.lastVisit === 'string' ? p.lastVisit : null,
    log: Array.isArray(p.log) ? p.log.slice(0, LOG_SIZE) : [],
  };
}

// Dia no fuso da pessoa: a virada é à meia-noite dela, não em UTC
export function localDay(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysBetween(from, to) {
  const toDate = day => {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toDate(to) - toDate(from)) / 86_400_000);
}

export function addXp(progress, action) {
  const amount = XP_REWARDS[action] || 0;
  return {
    ...progress,
    xp: progress.xp + amount,
    log: [{ action, amount }, ...progress.log].slice(0, LOG_SIZE),
  };
}

// Devolve null se a visita de hoje já foi contada
export function applyDailyVisit(progress, today = localDay()) {
  if (progress.lastVisit === today) return null;
  const continues = progress.lastVisit && daysBetween(progress.lastVisit, today) === 1;
  const streak = continues ? progress.streak + 1 : 1;
  return addXp({ ...progress, streak, bestStreak: Math.max(progress.bestStreak, streak), lastVisit: today }, 'open');
}

export function getLevel(xp) {
  let index = 0;
  LEVELS.forEach((level, i) => { if (xp >= level.minXp) index = i; });
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const percent = next ? Math.floor(((xp - current.minXp) / (next.minXp - current.minXp)) * 100) : 100;
  return { name: current.name, index, next, percent, missing: next ? next.minXp - xp : 0 };
}
