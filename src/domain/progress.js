// Sequência de dias e XP. Lógica pura: quem grava é src/app/progress.js.
import { CHALLENGE_XP, normalizeChallenges } from './challenges.js';

export const XP_REWARDS = { open: 5, watched: 20, roulette: 10, match: 15, daily: CHALLENGE_XP.daily, weekly: CHALLENGE_XP.weekly };

export const XP_LABELS = { open: 'Visita do dia', watched: 'Título assistido', roulette: 'Giro da roleta', match: 'Match', daily: 'Desafio do dia', weekly: 'Meta da semana' };

export const LEVELS = [
  { name: 'Calouro', minXp: 0 },
  { name: 'Aprendiz', minXp: 100 },
  { name: 'Cinéfilo', minXp: 300 },
  { name: 'Crítico', minXp: 700 },
  { name: 'Maratonista', minXp: 1500 },
  { name: 'Lenda', minXp: 3000 },
];

const LOG_SIZE = 5;

// Contadores das conquistas sociais. friends guarda o maior número de amigos já visto:
// desfazer uma amizade não tira a conquista.
export const SOCIAL_KEYS = ['friends', 'sharesSent', 'ticketsShared', 'matches'];
export const EMPTY_SOCIAL = Object.freeze(Object.fromEntries(SOCIAL_KEYS.map(key => [key, 0])));

export const EMPTY_PROGRESS = { xp: 0, streak: 0, bestStreak: 0, lastVisit: null, log: [], social: EMPTY_SOCIAL, challenges: normalizeChallenges() };

export function normalizeProgress(raw) {
  const p = raw && typeof raw === 'object' ? raw : {};
  const count = value => (Number.isInteger(value) && value >= 0 ? value : 0);
  return {
    xp: count(p.xp),
    streak: count(p.streak),
    bestStreak: count(p.bestStreak),
    lastVisit: typeof p.lastVisit === 'string' ? p.lastVisit : null,
    log: Array.isArray(p.log) ? p.log.slice(0, LOG_SIZE) : [],
    social: Object.fromEntries(SOCIAL_KEYS.map(key => [key, count(p.social?.[key])])),
    challenges: normalizeChallenges(p.challenges),
  };
}

// Sem valor, soma 1 (uma indicação, um ingresso, um match). Com valor, guarda o maior (amigos).
// Devolve null quando nada muda, para não gravar à toa.
export function bumpSocial(progress, key, value) {
  if (!SOCIAL_KEYS.includes(key)) return null;
  const social = { ...EMPTY_SOCIAL, ...progress.social };
  const next = value === undefined ? social[key] + 1 : Math.max(social[key], Number.isInteger(value) && value > 0 ? value : 0);
  if (next === social[key]) return null;
  return { ...progress, social: { ...social, [key]: next } };
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
