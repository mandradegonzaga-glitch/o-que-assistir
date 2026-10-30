// Lista única de conquistas: a tela de perfil e o aviso de desbloqueio leem daqui.
// `icon` é a chave em src/ui/badgeIcons.js; `color` vai para o atributo data-color.

// Madrugada = 0h às 4h59 no horário local
export function isNightOwlWatch(entry) {
  if (!entry || !entry.watchedAt) return false;
  const date = new Date(entry.watchedAt);
  return !Number.isNaN(date.getTime()) && date.getHours() < 5;
}

const countGenre = (history, genreId) => history.filter(h => h.genres?.includes(genreId)).length;

export const BADGE_DEFINITIONS = [
  { name: 'Iniciante', desc: 'Assistiu 1 filme/série', icon: 'popcorn', color: 'gold', check: h => h.length >= 1 },
  { name: 'Cinéfilo', desc: 'Assistiu 10 filmes/séries', icon: 'film', color: 'red', check: h => h.length >= 10 },
  { name: 'Crítico', desc: 'Assistiu 50 itens', icon: 'monocle', color: 'purple', check: h => h.length >= 50 },
  { name: 'Maratonista', desc: 'Assistiu 5 séries', icon: 'tv', color: 'blue', check: h => h.filter(i => i.type === 'tv').length >= 5 },
  { name: 'Rei do Terror', desc: '3 filmes de terror', icon: 'ghost', color: 'violet', check: h => countGenre(h, 27) >= 3 },
  { name: 'Comediante', desc: '3 comédias', icon: 'laugh', color: 'yellow', check: h => countGenre(h, 35) >= 3 },
  { name: 'Romântico', desc: '3 romances', icon: 'heart', color: 'pink', check: h => countGenre(h, 10749) >= 3 },
  { name: 'Sci-Fi Nerd', desc: '3 ficções científicas', icon: 'alien', color: 'cyan', check: h => countGenre(h, 878) >= 3 },
  { name: 'Adrenalina', desc: '3 filmes de ação', icon: 'bolt', color: 'orange', check: h => countGenre(h, 28) >= 3 },
  { name: 'Apostador', desc: 'Ganhou 5x na roleta', icon: 'roulette', color: 'green', check: (_h, wins) => wins >= 5 },
  { name: 'Old School', desc: 'Filme antes de 2000', icon: 'vhs', color: 'brown', check: h => h.some(i => parseInt(i.year, 10) < 2000) },
  { name: 'Madrugador', desc: 'Marcou algo como visto de madrugada', icon: 'moon', color: 'violet', check: h => h.some(isNightOwlWatch) },
];

export function isBadgeEarned(badgeName, history, rouletteWins) {
  const badge = BADGE_DEFINITIONS.find(b => b.name === badgeName);
  if (!badge) return false;
  return badge.check(history, rouletteWins);
}

export function computeBadgeStatuses(history, rouletteWins) {
  return BADGE_DEFINITIONS.map(badge => ({
    badge,
    unlocked: badge.check(history, rouletteWins)
  }));
}
