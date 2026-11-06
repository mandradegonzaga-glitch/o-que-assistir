// Comparar gostos com um amigo: quanto do que cada um assiste cai nos mesmos gêneros,
// e quais títulos os dois já viram. Só com o histórico (o meu e o que o amigo compartilha).
import { GENRE_NAMES } from './genres.js';
import { genreWeights } from './tasteDna.js';

// Com menos títulos com gênero que isso, a porcentagem diria pouco
export const MATCH_MIN_TITLES = 3;
export const MATCH_SHARED_GENRES = 3;
// Diferença mínima (em fração do histórico) para dizer "fulano curte mais X"
const MIN_DIFFERENCE = 0.1;

const kindOf = type => (type === 'movie' ? 'movie' : 'tv'); // dorama também é série no TMDB

function shares(history) {
  const { titles, weights } = genreWeights(history);
  const total = [...weights.values()].reduce((sum, w) => sum + w, 0);
  const result = new Map();
  weights.forEach((w, id) => result.set(id, total > 0 ? w / total : 0));
  return { titles, shares: result };
}

export function compatibilityLabel(score) {
  if (score >= 80) return 'Almas gêmeas no sofá';
  if (score >= 60) return 'Gostos bem parecidos';
  if (score >= 40) return 'Alguns gostos em comum';
  return 'Gostos bem diferentes';
}

// "Terror", "Terror e Comédia", "Terror, Comédia e Drama"
export function joinNames(names) {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

// Títulos que os dois marcaram como vistos, na ordem do histórico do amigo (o mais recente primeiro).
// O meu usa { id, type }; o do amigo, { tmdb_id, media_type }.
export function titlesInCommon(mine, theirs) {
  const seen = new Set((mine || []).map(i => `${kindOf(i?.type)}:${i?.id}`));
  return (theirs || []).filter(i => seen.has(`${kindOf(i?.media_type)}:${i?.tmdb_id}`));
}

export function compareTastes(mine, theirs) {
  const a = shares(mine);
  const b = shares(theirs);
  const common = titlesInCommon(mine, theirs);
  if (a.titles < MATCH_MIN_TITLES || b.titles < MATCH_MIN_TITLES) {
    return { ready: false, needMine: a.titles < MATCH_MIN_TITLES, needTheirs: b.titles < MATCH_MIN_TITLES, common };
  }

  // Interseção das duas distribuições: soma, gênero a gênero, da menor fatia
  const ids = new Set([...a.shares.keys(), ...b.shares.keys()]);
  let overlap = 0;
  const rows = [...ids].map(id => {
    const mineShare = a.shares.get(id) || 0;
    const theirShare = b.shares.get(id) || 0;
    overlap += Math.min(mineShare, theirShare);
    return { id, name: GENRE_NAMES[id], mine: mineShare, theirs: theirShare };
  });
  const byName = (x, y) => x.name.localeCompare(y.name, 'pt-BR');

  const shared = rows
    .filter(r => r.mine > 0 && r.theirs > 0)
    .sort((x, y) => Math.min(y.mine, y.theirs) - Math.min(x.mine, x.theirs) || byName(x, y))
    .slice(0, MATCH_SHARED_GENRES)
    .map(r => r.name);
  const most = key => {
    const other = key === 'mine' ? 'theirs' : 'mine';
    const best = rows
      .filter(r => r[key] - r[other] >= MIN_DIFFERENCE)
      .sort((x, y) => (y[key] - y[other]) - (x[key] - x[other]) || byName(x, y))[0];
    return best ? best.name : null;
  };

  // Arredondado sem passar de 100 nem ficar abaixo de 0 por erro de ponto flutuante
  const score = Math.max(0, Math.min(100, Math.round(overlap * 100)));
  return { ready: true, score, label: compatibilityLabel(score), shared, mineMore: most('mine'), theirsMore: most('theirs'), common };
}
