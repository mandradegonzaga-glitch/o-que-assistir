import { BASE_URL } from '../config/constants.js';
import { getMoodGenres } from './moods.js';
import { DORAMA_PARAMS } from './mediaItem.js';
import { localDay } from '../utils/date.js';

export const MY_PROVIDERS_VALUE = 'minhas';

// "Gêneros" que o TMDB não tem: viram palavra-chave (207317 = christmas, conferido no TMDB)
const SPECIAL_GENRES = { natal: { keywords: '207317' } };

export function normalizeProviderIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(String).filter(id => /^\d+$/.test(id)))];
}

export function buildDiscoverUrl(endpoint, filters = {}) {
  const {
    genre = '',
    mood = '',
    provider = '',
    duration = '',
    yearFrom = '',
    yearTo = '',
    personId = null,
    country = '',
    isDorama = false,
    minVotes = 50,
    sortBy = 'popularity.desc',
    releases = null, // { today: Date } → só lançamentos recentes (ver releaseWindow)
  } = filters;

  let url = `${BASE_URL}/discover/${endpoint}?language=pt-BR&sort_by=${sortBy}&vote_count.gte=${minVotes}`;

  // Gênero escolhido à mão vence o clima
  const moodGenres = genre ? null : getMoodGenres(mood, endpoint);
  const special = SPECIAL_GENRES[genre];
  const withGenres = (special ? '' : genre) || moodGenres?.with;
  const withoutGenres = [isDorama ? DORAMA_PARAMS.without_genres : '', moodGenres?.without].filter(Boolean).join('|');

  // Dorama já é coreano: o país escolhido não vale aí
  if (isDorama) url += `&with_origin_country=${DORAMA_PARAMS.with_origin_country}`;
  else if (country) url += `&with_origin_country=${country}`;
  if (withGenres)    url += `&with_genres=${withGenres}`;
  if (special)       url += `&with_keywords=${special.keywords}`;
  if (withoutGenres) url += `&without_genres=${withoutGenres}`;
  if (provider) url += `&with_watch_providers=${provider}&watch_region=BR`;
  if (personId) url += `&with_people=${personId}`;

  if (duration === 'short')  url += '&with_runtime.lte=90';
  if (duration === 'medium') url += '&with_runtime.gte=90&with_runtime.lte=120';
  if (duration === 'long')   url += '&with_runtime.gte=120';

  // Lançamentos: o período deles vale no lugar dos anos escolhidos
  if (releases) {
    const w = releaseWindow(endpoint, releases.today);
    url += endpoint === 'tv'
      ? `&first_air_date.gte=${w.from}&first_air_date.lte=${w.to}`
      : `&release_date.gte=${w.from}&release_date.lte=${w.to}&with_release_type=4&region=BR`;
    return url;
  }

  if (yearFrom || yearTo) {
    const start = yearFrom || '1900';
    const end   = yearTo   || String(new Date().getFullYear());
    const dateField = endpoint === 'tv' ? 'first_air_date' : 'primary_release_date';
    url += `&${dateField}.gte=${start}-01-01&${dateField}.lte=${end}-12-31`;
  }

  return url;
}

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
