import { getMoodGenres } from './moods.js';
import { DORAMA_PARAMS, getTmdbEndpoint } from './mediaItem.js';
import { localDay } from '../utils/date.js';

export const MY_PROVIDERS_VALUE = 'minhas';

// "Gêneros" que o TMDB não tem: viram palavra-chave (207317 = christmas, conferido no TMDB)
const SPECIAL_GENRES = { natal: { keywords: '207317' } };

export function normalizeProviderIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(String).filter(id => /^\d+$/.test(id)))];
}

// Pedido ao /discover do TMDB com os filtros do app; type é o tipo do app (movie, tv ou dorama)
export function discoverRequest(type, filters = {}) {
  const {
    genre = '',
    mood = '',
    provider = '',
    duration = '',
    yearFrom = '',
    yearTo = '',
    personId = null,
    country = '',
    minVotes = 50,
    minRating = null,
    sortBy = 'popularity.desc',
    releases = null, // { today: Date } → só lançamentos recentes (ver releaseWindow)
  } = filters;
  const endpoint = getTmdbEndpoint(type);
  const isDorama = type === 'dorama';

  // Gênero escolhido à mão vence o clima
  const moodGenres = genre ? null : getMoodGenres(mood, endpoint);
  const special = SPECIAL_GENRES[genre];
  const params = {
    sort_by: sortBy,
    'vote_count.gte': minVotes,
    'vote_average.gte': minRating,
    // Dorama já é coreano: o país escolhido não vale aí
    with_origin_country: isDorama ? DORAMA_PARAMS.with_origin_country : country,
    with_genres: (special ? '' : genre) || moodGenres?.with,
    with_keywords: special?.keywords,
    without_genres: [isDorama ? DORAMA_PARAMS.without_genres : '', moodGenres?.without].filter(Boolean).join('|'),
    with_people: personId,
    ...(provider && { with_watch_providers: provider, watch_region: 'BR' }),
    ...RUNTIME[duration],
  };

  // Lançamentos: o período deles vale no lugar dos anos escolhidos
  if (releases) {
    const w = releaseWindow(endpoint, releases.today);
    Object.assign(params, endpoint === 'tv'
      ? { 'first_air_date.gte': w.from, 'first_air_date.lte': w.to }
      : { 'release_date.gte': w.from, 'release_date.lte': w.to, with_release_type: 4, region: 'BR' });
  } else if (yearFrom || yearTo) {
    const dateField = endpoint === 'tv' ? 'first_air_date' : 'primary_release_date';
    params[`${dateField}.gte`] = `${yearFrom || '1900'}-01-01`;
    params[`${dateField}.lte`] = `${yearTo || new Date().getFullYear()}-12-31`;
  }

  return { path: `/discover/${endpoint}`, params };
}

const RUNTIME = {
  short: { 'with_runtime.lte': 90 },
  medium: { 'with_runtime.gte': 90, 'with_runtime.lte': 120 },
  long: { 'with_runtime.gte': 120 },
};

export function getRandomPage(max = 5) {
  return Math.floor(Math.random() * max) + 1;
}

// Filme: o que chegou ao digital (streaming, aluguel) no Brasil nos últimos 45 dias.
// Série e dorama: o que estreou nos últimos 60 dias (séries saem em ritmo mais lento).
export const RELEASE_DAYS = { movie: 45, tv: 60 };

// Sem nome em português o TMDB devolve o original (조선…, กฎ…): para quem lê aqui, fica de fora
export const hasLatinTitle = item => /[A-Za-zÀ-ÿ]/.test(item?.title || item?.name || '');

export function releaseWindow(endpoint, today = new Date()) {
  const days = RELEASE_DAYS[endpoint === 'tv' ? 'tv' : 'movie'];
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  return { from: localDay(from), to: localDay(today), days };
}
