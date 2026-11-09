// DNA do usuário: o que a pessoa mais assiste, calculado só com o histórico salvo
// (gêneros, tipo, ano e data de cada título). Sem rede: abre na hora e funciona offline.
import { GENRE_NAMES, asMovieGenres, genreIds } from './genres.js';
import { isSeriesType } from './mediaItem.js';

const DNA_TOP_GENRES = 5;
const DNA_MONTHS = 6;
// Abaixo disto o DNA aparece, mas avisa que ainda está se formando
export const DNA_STABLE_TITLES = 5;
// Quantos nomes de "Outros" aparecem antes de "e mais N"
const DNA_OTHER_NAMES = 5;

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Gêneros de um título do histórico, com os de série juntados nos de filme
export const genreIdsOf = entry => asMovieGenres(genreIds(entry?.genres));

// Arredonda para inteiros que somam exatamente 100 (maior resto)
export function roundToHundred(weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return weights.map(() => 0);
  const exact = weights.map(w => (w / total) * 100);
  const result = exact.map(Math.floor);
  let missing = 100 - result.reduce((sum, v) => sum + v, 0);
  // Restos iguais (a menos do erro de ponto flutuante) desempatam pelo maior peso
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  exact
    .map((v, i) => ({ i, rest: v - Math.floor(v) }))
    .sort((a, b) => (same(a.rest, b.rest) ? weights[b.i] - weights[a.i] || a.i - b.i : b.rest - a.rest))
    .forEach(({ i }) => {
      if (missing > 0) { result[i]++; missing--; }
    });
  return result;
}

// Cada título vale 1, dividido entre os seus gêneros: um título com cinco gêneros não pesa
// cinco vezes mais que um com um só.
export function genreWeights(history) {
  const weights = new Map();
  let titles = 0;
  for (const entry of history || []) {
    const ids = genreIdsOf(entry);
    if (ids.length === 0) continue;
    titles++;
    ids.forEach(id => weights.set(id, (weights.get(id) || 0) + 1 / ids.length));
  }
  return { titles, weights };
}

export function genreDna(history, top = DNA_TOP_GENRES) {
  const { titles, weights } = genreWeights(history);

  const ranked = [...weights.entries()]
    .map(([id, weight]) => ({ id, name: GENRE_NAMES[id], weight }))
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'pt-BR'));

  const shown = ranked.slice(0, top);
  const rest = ranked.slice(top);
  const otherWeight = rest.reduce((sum, g) => sum + g.weight, 0);
  // Outros guarda os nomes (na ordem do peso) para a tela dizer o que entrou nele
  const groups = otherWeight > 0
    ? [...shown, { id: 'other', name: 'Outros', weight: otherWeight, members: rest.map(g => g.name) }]
    : shown;
  const percents = roundToHundred(groups.map(g => g.weight));

  return {
    titles,
    genres: groups.map((g, i) => ({ id: g.id, name: g.name, percent: percents[i], ...(g.members ? { members: g.members } : {}) })),
  };
}

// "Ação, Animação, Aventura, Comédia, Família e mais 3"
export function otherNamesText(members, limit = DNA_OTHER_NAMES) {
  const list = members || [];
  if (list.length === 0) return '';
  // "e mais 1" ocupa o mesmo espaço que o nome: só encurta quando sobram 2 ou mais
  if (list.length > limit + 1) return `${list.slice(0, limit).join(', ')} e mais ${list.length - limit}`;
  return list.length === 1 ? list[0] : `${list.slice(0, -1).join(', ')} e ${list[list.length - 1]}`;
}

export function typeSplit(history) {
  const split = { movie: 0, tv: 0, dorama: 0 };
  for (const entry of history || []) {
    const type = isSeriesType(entry?.type) ? entry.type : 'movie';
    split[type]++;
  }
  return split;
}

// Década com mais títulos; no empate, a mais recente
export function favoriteDecade(history) {
  const counts = new Map();
  for (const entry of history || []) {
    const year = parseInt(entry?.year, 10);
    if (!Number.isInteger(year) || year < 1880 || year > 2200) continue;
    const decade = Math.floor(year / 10) * 10;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  }
  let best = null;
  counts.forEach((count, decade) => {
    if (!best || count > best.count || (count === best.count && decade > best.decade)) best = { decade, count };
  });
  return best;
}

// Títulos marcados como vistos em cada um dos últimos meses (o atual por último), na hora local
export function monthlyActivity(history, now = new Date(), months = DNA_MONTHS) {
  const slots = [];
  for (let back = months - 1; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    slots.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()], count: 0 });
  }
  for (const entry of history || []) {
    const when = entry?.watchedAt ? new Date(entry.watchedAt) : null;
    if (!when || Number.isNaN(when.getTime())) continue;
    const slot = slots.find(s => s.year === when.getFullYear() && s.month === when.getMonth());
    if (slot) slot.count++;
  }
  return slots.map(({ year, month, label, count }) => ({ key: `${year}-${String(month + 1).padStart(2, '0')}`, label, count }));
}

// "40% Terror, 30% Comédia e 30% Ação" (sem "Outros")
export function dnaSentence(genres) {
  const parts = (genres || []).filter(g => g.id !== 'other' && g.percent > 0).map(g => `${g.percent}% ${g.name}`);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

export function computeTasteDna(history, now = new Date()) {
  const list = Array.isArray(history) ? history : [];
  const dna = genreDna(list);
  return {
    total: list.length,
    genreTitles: dna.titles,
    genres: dna.genres,
    sentence: dnaSentence(dna.genres),
    forming: dna.titles < DNA_STABLE_TITLES,
    types: typeSplit(list),
    decade: favoriteDecade(list),
    months: monthlyActivity(list, now),
  };
}
