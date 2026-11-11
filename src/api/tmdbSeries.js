// Temporadas do TMDB, guardadas por 1 hora: a lista de episódios, o "Em andamento" e o
// "marcar tudo" pedem as mesmas temporadas várias vezes seguidas.
import { tmdbGet } from './tmdb.js';
import { MemoryCache } from '../utils/cache.js';

const seasons = new MemoryCache(3_600_000);
const keyOf = (seriesId, seasonNumber) => `${seriesId}-${seasonNumber}`;

// Já carregada? (sem pedir à rede)
export function cachedSeason(seriesId, seasonNumber) {
  return seasons.get(keyOf(seriesId, seasonNumber));
}

// { season_number, episodes: [{ season_number, episode_number, name }] }. Falha de rede: lança.
export async function getSeason(seriesId, seasonNumber) {
  const cached = cachedSeason(seriesId, seasonNumber);
  if (cached) return cached;
  const json = await tmdbGet(`/tv/${seriesId}/season/${seasonNumber}`);
  const season = {
    season_number: json.season_number,
    episodes: (json.episodes || []).map(ep => ({
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      name: ep.name || `Episódio ${ep.episode_number}`,
      air_date: ep.air_date || '', // data, foto da cena e sinopse: a lista de episódios mostra
      overview: ep.overview || '',
      still_path: ep.still_path || null,
    })),
  };
  seasons.set(keyOf(seriesId, seasonNumber), season);
  return season;
}

// Temporadas 1..n que carregaram (sem a 0, de especiais); as que falharem ficam de fora
export async function getAllSeasons(seriesId, numberOfSeasons) {
  const numbers = Array.from({ length: numberOfSeasons }, (_, i) => i + 1);
  const results = await Promise.all(numbers.map(n => getSeason(seriesId, n).catch(() => null)));
  return results.filter(Boolean);
}
