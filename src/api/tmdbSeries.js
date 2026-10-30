/**
 * tmdbSeries.js — chamadas TMDB para estrutura de série (seasons/episodes)
 *
 * Cache de temporada com TTL de 1 hora (D002).
 * Season 0 filtrada antes de retornar (D004).
 */

import { API_KEY, BASE_URL } from '../config/constants.js';
import { MemoryCache } from '../utils/cache.js';
import { filterSeason0 } from '../domain/seriesProgress.js';

const SEASON_CACHE_TTL = 3_600_000; // 1 hora
const seasonCache = new MemoryCache(SEASON_CACHE_TTL);

/**
 * Busca detalhes de uma temporada específica via TMDB.
 * Resultado é cacheado por 1 hora.
 * Season 0 nunca é retornada mesmo se solicitada explicitamente.
 *
 * @param {number} seriesId - TMDB series ID
 * @param {number} seasonNumber - número da temporada (≥ 1)
 * @returns {Promise<{season_number: number, episodes: Array}>}
 */
export async function fetchSeasonDetails(seriesId, seasonNumber) {
  if (seasonNumber === 0) return { season_number: 0, episodes: [] };

  const cacheKey = `season-${seriesId}-${seasonNumber}`;
  const cached = seasonCache.get(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/tv/${seriesId}/season/${seasonNumber}?api_key=${API_KEY}&language=pt-BR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB season fetch failed: ${res.status}`);

  const data = await res.json();
  const result = {
    season_number: data.season_number,
    episodes: (data.episodes || []).map(ep => ({
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      name: ep.name,
      air_date: ep.air_date,
    })),
  };

  seasonCache.set(cacheKey, result);
  return result;
}

/**
 * Busca todos os detalhes de uma série (sem Season 0).
 * Retorna lista de seasons com episodes — cacheada por season individualmente.
 *
 * @param {number} seriesId - TMDB series ID
 * @param {number} numberOfSeasons - total de seasons (do objeto de série TMDB)
 * @returns {Promise<Array<{season_number: number, episodes: Array}>>}
 */
export async function fetchAllSeasons(seriesId, numberOfSeasons) {
  if (!numberOfSeasons || numberOfSeasons < 1) return [];

  const seasonNumbers = Array.from({ length: numberOfSeasons }, (_, i) => i + 1);
  const results = await Promise.all(
    seasonNumbers.map(n => fetchSeasonDetails(seriesId, n))
  );

  return filterSeason0(results);
}

/**
 * Invalida o cache de uma temporada específica.
 * Útil quando o usuário força refresh.
 *
 * @param {number} seriesId
 * @param {number} seasonNumber
 */
export function invalidateSeasonCache(seriesId, seasonNumber) {
  seasonCache.delete(`season-${seriesId}-${seasonNumber}`);
}
