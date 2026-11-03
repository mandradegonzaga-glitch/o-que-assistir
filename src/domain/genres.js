// Nomes dos gêneros do TMDB em português (filmes e séries), para não buscar /genre/list a cada tela
export const GENRE_NAMES = {
  28: 'Ação', 12: 'Aventura', 16: 'Animação', 35: 'Comédia', 80: 'Crime', 99: 'Documentário',
  18: 'Drama', 10751: 'Família', 14: 'Fantasia', 36: 'História', 27: 'Terror', 10402: 'Música',
  9648: 'Mistério', 10749: 'Romance', 878: 'Ficção científica', 10770: 'Filme de TV', 53: 'Suspense',
  10752: 'Guerra', 37: 'Faroeste',
  10759: 'Ação e aventura', 10762: 'Infantil', 10763: 'Notícias', 10764: 'Reality', 10765: 'Ficção e fantasia',
  10766: 'Novela', 10767: 'Talk show', 10768: 'Guerra e política',
};

// Aceita ids (genre_ids do /discover) ou objetos { id, name } (detalhes do título)
export function genreNames(genres, limit = 3) {
  if (!Array.isArray(genres)) return [];
  const names = genres
    .map(g => (g && typeof g === 'object' ? g.name || GENRE_NAMES[g.id] : GENRE_NAMES[g]))
    .filter(Boolean);
  return [...new Set(names)].slice(0, limit);
}
