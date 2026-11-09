// Coleções prontas: listas do app, montadas com os títulos mais bem avaliados de cada tema no TMDB.
// A pessoa abre, vê e pode copiar para as próprias listas (src/app/userLists.js).
import { hasLatinTitle } from './filters.js';
import { DORAMA_PARAMS, MEDIA_KIND, getTmdbEndpoint } from './mediaItem.js';
import { toListItem } from './userLists.js';

const best = (votes, extra = {}) => ({ sort_by: 'vote_average.desc', 'vote_count.gte': votes, ...extra });

export const COLLECTIONS = [
  { id: 'terror', name: 'Clássicos do terror', emoji: '🎃', type: 'movie', params: best(3000, { with_genres: '27', without_genres: '16' }) },
  { id: 'chorar', name: 'Romances para chorar', emoji: '😭', type: 'movie', params: best(2000, { with_genres: '18,10749', without_genres: '35|27|16|80' }) },
  { id: 'familia', name: 'Animações para a família', emoji: '🧸', type: 'movie', params: best(3000, { with_genres: '16,10751' }) },
  { id: 'rir', name: 'Comédias para rir', emoji: '😂', type: 'movie', params: best(3000, { with_genres: '35', without_genres: '16|18|80|10749' }) },
  { id: 'ficcao', name: 'Ficção científica', emoji: '🚀', type: 'movie', params: best(5000, { with_genres: '878', without_genres: '16' }) },
  { id: 'notas', name: 'Filmes mais bem avaliados', emoji: '🏆', type: 'movie', params: best(10000) },
  { id: 'series', name: 'Séries imperdíveis', emoji: '📚', type: 'tv', params: best(3000, { without_genres: '16|10764|10767|10763' }) },
  { id: 'doramas', name: 'Doramas queridinhos', emoji: '❤️', type: 'dorama', params: best(300, { ...DORAMA_PARAMS, without_genres: '16|10764|10767|10763' }) },
];

export const collectionById = id => COLLECTIONS.find(c => c.id === id) || null;

export const collectionKind = c => MEDIA_KIND[c.type].many;

export const collectionPath = c => `/discover/${getTmdbEndpoint(c.type)}`;

// Resposta do TMDB → títulos da coleção: com pôster, sem repetir e com nome legível (dorama sem tradução fica de fora)
export function collectionItems(c, results = []) {
  const seen = new Set();
  return results
    .filter(r => r?.id && r.poster_path && hasLatinTitle(r) && !seen.has(r.id) && seen.add(r.id))
    .map(r => toListItem({ ...r, media_type: c.type }));
}
