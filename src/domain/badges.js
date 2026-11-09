// Lista única de conquistas: a tela de perfil e o aviso de desbloqueio leem daqui.
// `icon` é a chave em src/ui/badgeIcons.js; `color` vai para o atributo data-color.
// `count(history, wins, progress)` mede quanto já foi feito; a conquista sai quando chega em `goal`.
// progress traz bestStreak e os contadores sociais (src/domain/progress.js).
import { isSeriesType } from './mediaItem.js';


// Madrugada = 0h às 4h59 no horário local
export function isNightOwlWatch(entry) {
  if (!entry || !entry.watchedAt) return false;
  const date = new Date(entry.watchedAt);
  return !Number.isNaN(date.getTime()) && date.getHours() < 5;
}

const countGenre = (history, ...genres) => history.filter(h => genres.some(g => h.genres?.includes(g))).length;
const isSeries = i => isSeriesType(i.type);
const social = (p, key) => p?.social?.[key] || 0;
const streak = p => p?.bestStreak || 0;
const anyOf = (history, test) => (history.some(test) ? 1 : 0);

export const BADGE_CATEGORIES = ['Jornada', 'Gêneros', 'Hábitos', 'Social'];

const DEFINITIONS = [
  { name: 'Iniciante', category: 'Jornada', desc: 'Assistiu 1 filme/série', icon: 'popcorn', color: 'gold', goal: 1, count: h => h.length },
  { name: 'Cinéfilo', category: 'Jornada', desc: 'Assistiu 10 filmes/séries', icon: 'film', color: 'red', goal: 10, count: h => h.length },
  { name: 'Crítico', category: 'Jornada', desc: 'Assistiu 50 itens', icon: 'monocle', color: 'purple', goal: 50, count: h => h.length },
  { name: 'Centenário', category: 'Jornada', desc: 'Assistiu 100 itens', icon: 'trophy', color: 'gold', goal: 100, count: h => h.length },
  { name: 'Maratonista', category: 'Jornada', desc: 'Assistiu 5 séries', icon: 'tv', color: 'blue', goal: 5, count: h => h.filter(isSeries).length },
  { name: 'Dorameiro', category: 'Jornada', desc: 'Assistiu 5 doramas', icon: 'sakura', color: 'pink', goal: 5, count: h => h.filter(i => i.type === 'dorama').length },
  { name: 'Old School', category: 'Jornada', desc: 'Filme antes de 2000', icon: 'vhs', color: 'brown', goal: 1, count: h => anyOf(h, i => parseInt(i.year, 10) < 2000) },
  { name: 'Rei do Terror', category: 'Gêneros', desc: '3 filmes de terror', icon: 'ghost', color: 'violet', goal: 3, count: h => countGenre(h, 27) },
  { name: 'Comediante', category: 'Gêneros', desc: '3 comédias', icon: 'laugh', color: 'yellow', goal: 3, count: h => countGenre(h, 35) },
  { name: 'Romântico', category: 'Gêneros', desc: '3 romances', icon: 'heart', color: 'pink', goal: 3, count: h => countGenre(h, 10749) },
  { name: 'Sci-Fi Nerd', category: 'Gêneros', desc: '3 ficções científicas', icon: 'alien', color: 'cyan', goal: 3, count: h => countGenre(h, 878, 10765) },
  { name: 'Adrenalina', category: 'Gêneros', desc: '3 filmes de ação', icon: 'bolt', color: 'orange', goal: 3, count: h => countGenre(h, 28, 10759) },
  { name: 'Animado', category: 'Gêneros', desc: '3 animações', icon: 'sparkles', color: 'cyan', goal: 3, count: h => countGenre(h, 16) },
  { name: 'Documentarista', category: 'Gêneros', desc: '3 documentários', icon: 'camera', color: 'green', goal: 3, count: h => countGenre(h, 99) },
  { name: 'Investigador', category: 'Gêneros', desc: '3 títulos de crime ou mistério', icon: 'detective', color: 'blue', goal: 3, count: h => countGenre(h, 80, 9648) },
  { name: 'Apostador', category: 'Hábitos', desc: 'Ganhou 5x na roleta', icon: 'roulette', color: 'green', goal: 5, count: (_h, wins) => wins || 0 },
  { name: 'Madrugador', category: 'Hábitos', desc: 'Marcou algo como visto de madrugada', icon: 'moon', color: 'violet', goal: 1, count: h => anyOf(h, isNightOwlWatch) },
  { name: 'Foguinho', category: 'Hábitos', desc: '7 dias seguidos no app', icon: 'flame', color: 'orange', goal: 7, count: (_h, _w, p) => streak(p) },
  { name: 'Constante', category: 'Hábitos', desc: '30 dias seguidos no app', icon: 'flame', color: 'red', goal: 30, count: (_h, _w, p) => streak(p) },
  { name: 'Imparável', category: 'Hábitos', desc: '100 dias seguidos no app', icon: 'flame', color: 'gold', goal: 100, count: (_h, _w, p) => streak(p) },
  { name: 'Turma', category: 'Social', desc: 'Fez o primeiro amigo no app', icon: 'friends', color: 'blue', goal: 1, count: (_h, _w, p) => social(p, 'friends') },
  { name: 'Popular', category: 'Social', desc: '5 amigos no app', icon: 'friends', color: 'gold', goal: 5, count: (_h, _w, p) => social(p, 'friends') },
  { name: 'Indicador', category: 'Social', desc: 'Indicou um título a um amigo', icon: 'send', color: 'cyan', goal: 1, count: (_h, _w, p) => social(p, 'sharesSent') },
  { name: 'Curador', category: 'Social', desc: 'Indicou 10 títulos a amigos', icon: 'send', color: 'purple', goal: 10, count: (_h, _w, p) => social(p, 'sharesSent') },
  { name: 'Bilheteiro', category: 'Social', desc: 'Compartilhou um ingresso', icon: 'ticket', color: 'orange', goal: 1, count: (_h, _w, p) => social(p, 'ticketsShared') },
  { name: 'Par Perfeito', category: 'Social', desc: 'Deu match com alguém no Match', icon: 'heart', color: 'red', goal: 1, count: (_h, _w, p) => social(p, 'matches') },
];

// Quanto já foi feito, sem passar da meta. Meta 1 é "fez ou não fez": não mostra contagem.
export function badgeProgress(badge, history, rouletteWins, progress) {
  const raw = Number(badge.count(history || [], rouletteWins, progress)) || 0;
  const current = Math.min(Math.max(raw, 0), badge.goal);
  return { current, goal: badge.goal, counted: badge.goal > 1 };
}

// `check` continua existindo para quem só quer saber se ganhou
export const BADGE_DEFINITIONS = DEFINITIONS.map(badge => ({
  ...badge,
  check: (history, wins, progress) => badgeProgress(badge, history, wins, progress).current >= badge.goal,
}));

export function computeBadgeStatuses(history, rouletteWins, progress) {
  return BADGE_DEFINITIONS.map(badge => {
    const { current, goal, counted } = badgeProgress(badge, history, rouletteWins, progress);
    return { badge, unlocked: current >= goal, current, goal, counted };
  });
}
