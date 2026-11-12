// Nomes dos gêneros do TMDB em português (filmes e séries), para não buscar /genre/list a cada tela
export const GENRE_NAMES = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime', 99: 'Documentário',
  18: 'Drama', 10751: 'Família', 14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
  9648: 'Mistério', 10749: 'Romance', 878: 'Ficção científica', 10770: 'Filme de TV', 53: 'Suspense',
  10752: 'Guerra', 37: 'Faroeste',
  10759: 'Ação e aventura', 10762: 'Infantil', 10763: 'Notícias', 10764: 'Reality', 10765: 'Ficção e fantasia',
  10766: 'Novela', 10767: 'Talk show', 10768: 'Guerra e política',
};

// Gêneros principais, na ordem em que aparecem: filtros, primeira visita e o cartão "Seu gosto"
export const MAIN_GENRE_IDS = [28, 35, 27, 10749, 18, 53, 878, 16];

// Gêneros que o TMDB tem para séries (Terror, Romance, Suspense, Música, História não existem)
export const TV_GENRE_IDS = new Set([10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37]);

// Gêneros de série que juntam gêneros de filme: no gosto da pessoa, contam como eles
export const TV_GENRE_PARTS = {
  10759: [28, 12],    // Ação e aventura → Ação, Aventura
  10765: [878, 14],   // Ficção e fantasia → Ficção científica, Fantasia
  10768: [10752],     // Guerra e política → Guerra
  10762: [10751],     // Infantil → Família
};

// Ids conhecidos, a partir de ids (genre_ids do /discover, às vezes em texto) ou objetos { id } (detalhes)
export function genreIds(genres) {
  if (!Array.isArray(genres)) return [];
  return genres
    .map(g => Number(g && typeof g === 'object' ? g.id : g))
    .filter(id => Number.isInteger(id) && GENRE_NAMES[id]);
}

// Os de série que juntam dois de filme viram os de filme: "Ação e aventura" e um filme de ação somam juntos
export function asMovieGenres(ids) {
  return [...new Set(ids.flatMap(id => TV_GENRE_PARTS[id] || [id]))];
}

// O gênero de filme como existe em série (o próprio, ou o que o junta com outro); null se não existir
export function movieGenreOnTv(id) {
  if (TV_GENRE_IDS.has(id)) return id;
  const merged = Object.keys(TV_GENRE_PARTS).find(tv => TV_GENRE_PARTS[tv].includes(id));
  return merged ? Number(merged) : null;
}

// Aceita ids (genre_ids do /discover) ou objetos { id, name } (detalhes do título)
export function genreNames(genres, limit = 3) {
  if (!Array.isArray(genres)) return [];
  const names = genres
    .map(g => (g && typeof g === 'object' ? g.name || GENRE_NAMES[g.id] : GENRE_NAMES[g]))
    .filter(Boolean);
  return [...new Set(names)].slice(0, limit);
}
