// Desafio do dia e meta da semana. Lógica pura: quem grava é src/app/progress.js.
// O andamento fica em progress.challenges, junto com o XP (conta: metadados; convidado: aparelho).
import { DAY_MS, dayFromNumber, dayNumber } from '../utils/date.js';
import { genreIds } from './genres.js';

const yearOf = detail => parseInt(String(detail?.year || detail?.release_date || detail?.first_air_date || '').slice(0, 4), 10);
const hasGenre = (detail, ...ids) => {
  const genres = genreIds(detail?.genres ?? detail?.genre_ids);
  return ids.some(id => genres.includes(id));
};

// `event` é o que o app avisa (ver trackChallenge); `matches` filtra pelo título, quando importa.
// `account: true` só aparece para quem tem conta (precisa de amigos).
export const DAILY_CHALLENGES = [
  { id: 'watch1', text: 'Marque 1 título como assistido', event: 'watched', goal: 1, icon: 'popcorn' },
  { id: 'save2', text: 'Salve 2 títulos em Quero Assistir', event: 'saved', goal: 2, icon: 'film' },
  { id: 'open3', text: 'Abra 3 títulos para ver os detalhes', event: 'opened', goal: 3, icon: 'monocle' },
  { id: 'horror', text: 'Descubra um título de terror', event: 'opened', goal: 1, icon: 'ghost', matches: d => hasGenre(d, 27) },
  { id: 'comedy', text: 'Descubra uma comédia', event: 'opened', goal: 1, icon: 'laugh', matches: d => hasGenre(d, 35) },
  { id: 'classic', text: 'Descubra um título lançado antes de 2000', event: 'opened', goal: 1, icon: 'vhs', matches: d => yearOf(d) < 2000 },
  { id: 'roulette', text: 'Gire a roleta', event: 'roulette', goal: 1, icon: 'roulette' },
  { id: 'match', text: 'Dê um match no Match', event: 'match', goal: 1, icon: 'heart' },
  { id: 'ticket', text: 'Compartilhe um ingresso', event: 'ticket', goal: 1, icon: 'ticket' },
  { id: 'share', text: 'Indique um título a um amigo', event: 'shared', goal: 1, icon: 'send', account: true },
];

export const WEEKLY_GOAL = { id: 'week-watch3', text: 'Assista 3 títulos esta semana', event: 'watched', goal: 3, icon: 'trophy' };

export const CHALLENGE_XP = { daily: 25, weekly: 50 };


// Passo 7: dias seguidos nunca caem no mesmo desafio (7 não divide 9 nem 10)
export function dailyChallengeFor(day, { guest = false } = {}) {
  const pool = DAILY_CHALLENGES.filter(c => !(guest && c.account));
  const index = ((dayNumber(day) * 7) % pool.length + pool.length) % pool.length;
  return pool[index];
}

// Semana de segunda a domingo; a chave é a segunda-feira
export function weekKey(day) {
  const n = dayNumber(day);
  const weekday = (new Date(n * DAY_MS).getUTCDay() + 6) % 7; // segunda = 0
  return dayFromNumber(n - weekday);
}

const count = value => (Number.isInteger(value) && value >= 0 ? value : 0);

export function normalizeChallenges(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  return {
    day: typeof c.day === 'string' ? c.day : null,
    dailyId: typeof c.dailyId === 'string' ? c.dailyId : null,
    daily: count(c.daily),
    week: typeof c.week === 'string' ? c.week : null,
    weekly: count(c.weekly),
  };
}

// Estado de hoje: o que ficou de outro dia (ou de outro desafio) volta a zero
export function currentChallenges(rawChallenges, today, { guest = false } = {}) {
  const saved = normalizeChallenges(rawChallenges);
  const daily = dailyChallengeFor(today, { guest });
  const dailyCount = saved.day === today && saved.dailyId === daily.id ? Math.min(saved.daily, daily.goal) : 0;
  const week = weekKey(today);
  const weeklyCount = saved.week === week ? Math.min(saved.weekly, WEEKLY_GOAL.goal) : 0;
  return {
    stored: { day: today, dailyId: daily.id, daily: dailyCount, week, weekly: weeklyCount },
    daily: { ...daily, count: dailyCount, done: dailyCount >= daily.goal, xp: CHALLENGE_XP.daily },
    weekly: { ...WEEKLY_GOAL, count: weeklyCount, done: weeklyCount >= WEEKLY_GOAL.goal, xp: CHALLENGE_XP.weekly },
  };
}

// Conta um acontecimento. Devolve null quando nada muda (para não gravar à toa);
// senão, o novo estado e quais terminaram agora ('daily', 'weekly').
export function applyChallengeEvent(rawChallenges, event, detail, today, { guest = false } = {}) {
  const now = currentChallenges(rawChallenges, today, { guest });
  const next = { ...now.stored };
  const completed = [];

  const { daily, weekly } = now;
  if (!daily.done && daily.event === event && (!daily.matches || daily.matches(detail))) {
    next.daily += 1;
    if (next.daily >= daily.goal) completed.push('daily');
  }
  if (!weekly.done && weekly.event === event) {
    next.weekly += 1;
    if (next.weekly >= weekly.goal) completed.push('weekly');
  }

  if (next.daily === now.stored.daily && next.weekly === now.stored.weekly) return null;
  return { challenges: next, completed };
}
