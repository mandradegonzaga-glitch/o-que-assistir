// Clima → gêneros do TMDB. "|" significa OU. Filmes e séries têm listas de gêneros diferentes
// (ação em série é 10759; terror e romance nem existem como gênero de série).
export const MOODS = {
  leve: {
    movie: { with: '35|10751|16', without: '27|53|80' },
    tv: { with: '35|10751|16', without: '80|9648' },
  },
  chorar: {
    movie: { with: '18', without: '35|27|16' },
    tv: { with: '18', without: '35|16' },
  },
  tensao: {
    movie: { with: '53|27|9648', without: '35|10751' },
    tv: { with: '9648|80', without: '35|10751' },
  },
  adrenalina: {
    movie: { with: '28|12', without: '10751' },
    tv: { with: '10759', without: '10751' },
  },
  imaginacao: {
    movie: { with: '878|14', without: '27' },
    tv: { with: '10765', without: '' },
  },
};

export function getMoodGenres(mood, endpoint) {
  return MOODS[mood]?.[endpoint === 'tv' ? 'tv' : 'movie'] || null;
}
