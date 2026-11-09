// Indicações do dia: um filme, uma série e um dorama. Iguais para todo mundo no mesmo dia, ou,
// com histórico suficiente, pelos gêneros que a pessoa mais assiste (o DNA).
// Lógica pura: quem busca no TMDB e desenha é src/app/dailyPicks.js.
import { DNA_STABLE_TITLES, genreWeights } from './tasteDna.js';
import { dayNumber } from '../utils/date.js';

const PAGE_SIZE = 20; // resultados por página do /discover

// Abaixo disto o DNA ainda está se formando: ficam as indicações de todo mundo
export const PERSONAL_MIN_TITLES = DNA_STABLE_TITLES;
// Os gêneros favoritos se revezam, um por dia: até 3, e só os que pesam pelo menos metade do
// favorito (quem vê quase só terror não ganha um suspense a cada dois dias)
const PERSONAL_TOP_GENRES = 3;
const ROTATION_MIN_SHARE = 0.5;
const PERSONAL_PAGES = 3;

// Gêneros de filme que, em série, existem com outro nome (juntos com outro)
const MOVIE_TO_TV = { 28: 10759, 12: 10759, 878: 10765, 14: 10765, 10752: 10768 };
// Gêneros que o TMDB tem para séries (Terror, Romance, Suspense, Música, História não existem)
const TV_GENRES = new Set([10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37]);

// Só títulos bem avaliados e conhecidos; ordenados por número de votos, que muda pouco de um dia para o outro
export const PICK_KINDS = [
  {
    kind: 'movie', label: 'Filme', endpoint: 'movie', pages: 10,
    params: { 'vote_average.gte': 7.3, 'vote_count.gte': 3000 },
  },
  {
    kind: 'tv', label: 'Série', endpoint: 'tv', pages: 10,
    // Sem animação, reality e talk show. As coreanas ficam para o cartão Dorama (ver choosePick)
    params: { 'vote_average.gte': 7.8, 'vote_count.gte': 800, without_genres: '16|10764|10767' },
  },
  {
    kind: 'dorama', label: 'Dorama', endpoint: 'tv', pages: 6,
    params: { 'vote_average.gte': 7.8, 'vote_count.gte': 100, with_origin_country: 'KR', without_genres: '16' },
  },
];

// Passo 37 é primo com 120 e 200: o rodízio passa por todo o grupo antes de repetir,
// e dias seguidos caem em páginas diferentes. Cada tipo começa num ponto diferente.
export function pickSlot(kindIndex, day) {
  const kind = PICK_KINDS[kindIndex];
  const size = kind.pages * PAGE_SIZE;
  const position = (((dayNumber(day) + kindIndex * 11) * 37) % size + size) % size;
  return { page: Math.floor(position / PAGE_SIZE) + 1, index: position % PAGE_SIZE };
}

export function pickRequest(kindIndex, day) {
  const kind = PICK_KINDS[kindIndex];
  const { page, index } = pickSlot(kindIndex, day);
  return {
    path: `/discover/${kind.endpoint}`,
    params: { sort_by: 'vote_count.desc', include_adult: 'false', page, ...kind.params },
    index,
  };
}

const isKorean = item => Array.isArray(item?.origin_country) && item.origin_country.includes('KR');

// A página pode vir menor que o previsto, com título sem pôster ou (em Série) com uma coreana:
// anda até achar um que sirva
export function choosePick(results, index, kind, exclude = null) {
  const list = Array.isArray(results) ? results : [];
  for (let step = 0; step < list.length; step++) {
    const item = list[(index + step) % list.length];
    if (item?.poster_path && !(kind === 'tv' && isKorean(item)) && !exclude?.has(item.id)) return item;
  }
  return null;
}

// Gêneros do histórico com o peso de cada um, do mais assistido ao menos (ids de filme; os de
// série já vêm juntados). null = DNA ainda se formando: ficam as indicações de todo mundo.
export function pickProfile(history) {
  const { titles, weights } = genreWeights(history);
  if (titles < PERSONAL_MIN_TITLES) return null;
  const genres = [...weights.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([id, weight]) => ({ id, weight }));
  const watched = { movie: new Set(), tv: new Set() };
  for (const entry of history || []) {
    const id = Number(entry?.id);
    if (Number.isInteger(id)) watched[entry?.type === 'movie' || !entry?.type ? 'movie' : 'tv'].add(id);
  }
  return { genres, watched };
}

// Gêneros que entram no rodízio do cartão, na ordem do gosto: em série, o de filme vira o
// equivalente (Ação e Aventura somam no mesmo) ou sai, se não existir; os que o cartão já exclui
// (animação em série, por exemplo) também saem
export function usableGenres(genres, kindIndex, limit = PERSONAL_TOP_GENRES) {
  const kind = PICK_KINDS[kindIndex];
  const excluded = new Set(String(kind.params.without_genres || '').split('|').filter(Boolean).map(Number));
  const weights = new Map();
  for (const { id, weight } of genres || []) {
    const mapped = kind.endpoint === 'tv' ? (MOVIE_TO_TV[id] || id) : id;
    if (kind.endpoint === 'tv' && !TV_GENRES.has(mapped)) continue;
    if (excluded.has(mapped)) continue;
    weights.set(mapped, (weights.get(mapped) || 0) + weight);
  }
  const ranked = [...weights.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  if (ranked.length === 0) return [];
  const top = ranked[0][1];
  return ranked.filter(([, weight]) => weight >= top * ROTATION_MIN_SHARE - 1e-9).slice(0, limit).map(([id]) => id);
}

// Pedido sob medida: um dos gêneros favoritos (revezando por dia), com os mesmos filtros de qualidade.
// null = nenhum gênero da pessoa serve para este cartão.
export function personalRequest(kindIndex, day, profile) {
  const kind = PICK_KINDS[kindIndex];
  const genres = usableGenres(profile?.genres, kindIndex);
  if (genres.length === 0) return null;
  const n = dayNumber(day);
  const genre = genres[((n + kindIndex) % genres.length + genres.length) % genres.length];
  const size = PERSONAL_PAGES * PAGE_SIZE;
  const position = (((n + kindIndex * 11) * 37) % size + size) % size;
  return {
    path: `/discover/${kind.endpoint}`,
    params: { sort_by: 'vote_count.desc', include_adult: 'false', page: Math.floor(position / PAGE_SIZE) + 1, ...kind.params, with_genres: String(genre) },
    index: position % PAGE_SIZE,
    genre,
    exclude: profile.watched[kind.endpoint === 'movie' ? 'movie' : 'tv'],
  };
}

// Muda só quando os gêneros que contam mudam: marcar um título no meio do dia não troca o painel
export function profileKey(profile) {
  if (!profile) return 'all';
  return PICK_KINDS.map((_, i) => usableGenres(profile.genres, i).join('.')).join('|');
}

// Hora local até a próxima meia-noite, para trocar as indicações sem recarregar
export function msUntilMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next - now;
}
