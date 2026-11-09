// Surpreenda-me: um título bem avaliado de um gênero que a pessoa quase nunca vê.
// Usa os mesmos pesos do DNA (cada título vale 1, dividido entre os seus gêneros).
import { TV_GENRE_PARTS } from './genres.js';
import { genreWeights } from './tasteDna.js';

// Gêneros que valem uma surpresa (sem filme de TV, notícias, reality, talk show, novela, infantil)
export const SURPRISE_GENRES = {
  movie: [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37],
  tv: [10759, 16, 35, 80, 99, 18, 10751, 9648, 10765, 10768, 37],
  // Doramas: só os gêneros que existem de verdade entre os coreanos bem avaliados
  dorama: [10759, 35, 80, 18, 10751, 9648, 10765],
};

// Nota mínima e votos mínimos: surpresa, sim; filme ruim, não
export const SURPRISE_QUALITY = {
  movie: { 'vote_average.gte': 7, 'vote_count.gte': 300 },
  tv: { 'vote_average.gte': 7.5, 'vote_count.gte': 150 },
  dorama: { 'vote_average.gte': 7.5, 'vote_count.gte': 30 },
};

export function genreScores(history, type) {
  const { weights } = genreWeights(history);
  return SURPRISE_GENRES[type].map(id => {
    const ids = type === 'movie' ? [id] : [id, ...(TV_GENRE_PARTS[id] || [])];
    return { id, weight: ids.reduce((sum, g) => sum + (weights.get(g) || 0), 0) };
  });
}

// Os gêneros menos vistos, em ordem aleatória: o primeiro é a surpresa; os outros, a reserva
// se o TMDB não tiver nada bom naquele gênero com os filtros escolhidos
export function surpriseGenres(history, type, random = Math.random) {
  const scores = genreScores(history, type);
  const least = Math.min(...scores.map(s => s.weight));
  const rarest = scores.filter(s => s.weight <= least + 1e-9).map(s => s.id);
  const rest = scores.filter(s => s.weight > least + 1e-9).sort((a, b) => a.weight - b.weight).map(s => s.id);
  for (let i = rarest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rarest[i], rarest[j]] = [rarest[j], rarest[i]];
  }
  return [...rarest, ...rest];
}
