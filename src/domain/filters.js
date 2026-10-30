import { BASE_URL, API_KEY } from '../config/constants.js';

export function buildDiscoverUrl(endpoint, filters = {}) {
  const {
    genre = '',
    provider = '',
    duration = '',
    yearFrom = '',
    yearTo = '',
    personId = null,
    isDorama = false,
    minVotes = 50,
    sortBy = 'popularity.desc'
  } = filters;

  let url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&language=pt-BR&sort_by=${sortBy}&vote_count.gte=${minVotes}`;

  if (isDorama) url += '&with_origin_country=KR&without_genres=16';
  if (genre)    url += `&with_genres=${genre}`;
  if (provider) url += `&with_watch_providers=${provider}&watch_region=BR`;
  if (personId) url += `&with_people=${personId}`;

  if (duration === 'short')  url += '&with_runtime.lte=90';
  if (duration === 'medium') url += '&with_runtime.gte=90&with_runtime.lte=120';
  if (duration === 'long')   url += '&with_runtime.gte=120';

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
