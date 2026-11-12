// Cartão-ingresso "Seu gosto" do perfil (repasse da etapa 5d; referência: "Taste Profile Card", de
// Vicki Maiden): três dados grandes, os gêneros principais com os seus acesos e o que combina com você.
// Lógica pura: quem busca no TMDB e desenha é src/app/tasteCard.js.
import { GENRE_NAMES, MAIN_GENRE_IDS } from './genres.js';
import { computeTasteDna, decadeLabel } from './tasteDna.js';
import { formatCount } from '../utils/format.js';

const MATCHES = 3;

export function tasteCard(history, { name }) {
  const dna = computeTasteDna(history);
  const genres = dna.genres.filter(g => g.id !== 'other');
  const lit = new Set(genres.map(g => g.id));
  const favorite = genres[0] || null;
  return {
    title: name ? `O gosto de ${name}` : 'Seu gosto',
    empty: dna.total === 0,
    stats: dna.total === 0 ? [] : [
      { label: 'Gênero favorito', value: favorite?.name || '—' },
      { label: 'Década', value: dna.decade ? decadeLabel(dna.decade.decade) : '—' },
      { label: 'Títulos', value: formatCount(dna.total) },
    ],
    pills: MAIN_GENRE_IDS.map(id => ({ id, name: GENRE_NAMES[id], lit: lit.has(id) })),
    matchGenre: favorite?.id ?? null,
  };
}

// Filmes conhecidos do gênero favorito (os gêneros do DNA são os de filme)
export const matchRequest = genre => ({
  path: '/discover/movie',
  params: { with_genres: String(genre), sort_by: 'vote_count.desc', include_adult: 'false', page: 1 },
});

// Os primeiros que a pessoa ainda não viu, com pôster. Só filmes vistos contam: os ids de série são outros.
export function unseenMatches(results, history) {
  const watched = new Set((history || []).filter(e => e?.type === 'movie' || !e?.type).map(e => Number(e.id)));
  return (results || []).filter(r => r?.poster_path && !watched.has(r.id)).slice(0, MATCHES);
}
