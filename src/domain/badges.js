// Lista única de conquistas: a tela de perfil e o aviso de desbloqueio leem daqui.
// `icon` é a chave em src/ui/badgeIcons.js; `color` vai para o atributo data-color.
// `check(history, wins, progress)`: progress traz bestStreak e os contadores sociais (src/domain/progress.js).

// Madrugada = 0h às 4h59 no horário local
export function isNightOwlWatch(entry) {
  if (!entry || !entry.watchedAt) return false;
  const date = new Date(entry.watchedAt);
  return !Number.isNaN(date.getTime()) && date.getHours() < 5;
}

const countGenre = (history, ...genres) => history.filter(h => genres.some(g => h.genres?.includes(g))).length;
const isSeries = i => i.type === 'tv' || i.type === 'dorama';
const social = (p, key) => p?.social?.[key] || 0;

export const BADGE_CATEGORIES = ['Jornada', 'Gêneros', 'Hábitos', 'Social'];

export const BADGE_DEFINITIONS = [
  { name: 'Iniciante', category: 'Jornada', desc: 'Assistiu 1 filme/série', icon: 'popcorn', color: 'gold', check: h => h.length >= 1 },
  { name: 'Cinéfilo', category: 'Jornada', desc: 'Assistiu 10 filmes/séries', icon: 'film', color: 'red', check: h => h.length >= 10 },
  { name: 'Crítico', category: 'Jornada', desc: 'Assistiu 50 itens', icon: 'monocle', color: 'purple', check: h => h.length >= 50 },
  { name: 'Centenário', category: 'Jornada', desc: 'Assistiu 100 itens', icon: 'trophy', color: 'gold', check: h => h.length >= 100 },
  { name: 'Maratonista', category: 'Jornada', desc: 'Assistiu 5 séries', icon: 'tv', color: 'blue', check: h => h.filter(isSeries).length >= 5 },
  { name: 'Dorameiro', category: 'Jornada', desc: 'Assistiu 5 doramas', icon: 'sakura', color: 'pink', check: h => h.filter(i => i.type === 'dorama').length >= 5 },
  { name: 'Old School', category: 'Jornada', desc: 'Filme antes de 2000', icon: 'vhs', color: 'brown', check: h => h.some(i => parseInt(i.year, 10) < 2000) },
  { name: 'Rei do Terror', category: 'Gêneros', desc: '3 filmes de terror', icon: 'ghost', color: 'violet', check: h => countGenre(h, 27) >= 3 },
  { name: 'Comediante', category: 'Gêneros', desc: '3 comédias', icon: 'laugh', color: 'yellow', check: h => countGenre(h, 35) >= 3 },
  { name: 'Romântico', category: 'Gêneros', desc: '3 romances', icon: 'heart', color: 'pink', check: h => countGenre(h, 10749) >= 3 },
  { name: 'Sci-Fi Nerd', category: 'Gêneros', desc: '3 ficções científicas', icon: 'alien', color: 'cyan', check: h => countGenre(h, 878, 10765) >= 3 },
  { name: 'Adrenalina', category: 'Gêneros', desc: '3 filmes de ação', icon: 'bolt', color: 'orange', check: h => countGenre(h, 28, 10759) >= 3 },
  { name: 'Animado', category: 'Gêneros', desc: '3 animações', icon: 'sparkles', color: 'cyan', check: h => countGenre(h, 16) >= 3 },
  { name: 'Documentarista', category: 'Gêneros', desc: '3 documentários', icon: 'camera', color: 'green', check: h => countGenre(h, 99) >= 3 },
  { name: 'Investigador', category: 'Gêneros', desc: '3 títulos de crime ou mistério', icon: 'detective', color: 'blue', check: h => countGenre(h, 80, 9648) >= 3 },
  { name: 'Apostador', category: 'Hábitos', desc: 'Ganhou 5x na roleta', icon: 'roulette', color: 'green', check: (_h, wins) => wins >= 5 },
  { name: 'Madrugador', category: 'Hábitos', desc: 'Marcou algo como visto de madrugada', icon: 'moon', color: 'violet', check: h => h.some(isNightOwlWatch) },
  { name: 'Foguinho', category: 'Hábitos', desc: '7 dias seguidos no app', icon: 'flame', color: 'orange', check: (_h, _w, p) => (p?.bestStreak || 0) >= 7 },
  { name: 'Constante', category: 'Hábitos', desc: '30 dias seguidos no app', icon: 'flame', color: 'red', check: (_h, _w, p) => (p?.bestStreak || 0) >= 30 },
  { name: 'Imparável', category: 'Hábitos', desc: '100 dias seguidos no app', icon: 'flame', color: 'gold', check: (_h, _w, p) => (p?.bestStreak || 0) >= 100 },
  { name: 'Turma', category: 'Social', desc: 'Fez o primeiro amigo no app', icon: 'friends', color: 'blue', check: (_h, _w, p) => social(p, 'friends') >= 1 },
  { name: 'Popular', category: 'Social', desc: '5 amigos no app', icon: 'friends', color: 'gold', check: (_h, _w, p) => social(p, 'friends') >= 5 },
  { name: 'Indicador', category: 'Social', desc: 'Indicou um título a um amigo', icon: 'send', color: 'cyan', check: (_h, _w, p) => social(p, 'sharesSent') >= 1 },
  { name: 'Curador', category: 'Social', desc: 'Indicou 10 títulos a amigos', icon: 'send', color: 'purple', check: (_h, _w, p) => social(p, 'sharesSent') >= 10 },
  { name: 'Bilheteiro', category: 'Social', desc: 'Compartilhou um ingresso', icon: 'ticket', color: 'orange', check: (_h, _w, p) => social(p, 'ticketsShared') >= 1 },
  { name: 'Par Perfeito', category: 'Social', desc: 'Deu match com alguém no Match', icon: 'heart', color: 'red', check: (_h, _w, p) => social(p, 'matches') >= 1 },
];

export function isBadgeEarned(badgeName, history, rouletteWins, progress) {
  const badge = BADGE_DEFINITIONS.find(b => b.name === badgeName);
  if (!badge) return false;
  return badge.check(history, rouletteWins, progress);
}

export function computeBadgeStatuses(history, rouletteWins, progress) {
  return BADGE_DEFINITIONS.map(badge => ({
    badge,
    unlocked: badge.check(history, rouletteWins, progress)
  }));
}
