/**
 * seriesProgress.js — lógica pura de progresso de série
 *
 * Todas as funções são puras e não dependem de estado externo.
 * `watchedKeys` é sempre um Set de strings geradas por `buildEpisodeKey`.
 */

/**
 * Gera chave única para um episódio de uma série.
 * Formato: "{seriesId}-s{season}-e{episode}"
 *
 * @param {number} seriesId
 * @param {number} seasonNumber
 * @param {number} episodeNumber
 * @returns {string}
 */
export function buildEpisodeKey(seriesId, seasonNumber, episodeNumber) {
  return `${seriesId}-s${seasonNumber}-e${episodeNumber}`;
}

/**
 * Remove Season 0 (especiais/OVAs do TMDB) da lista de seasons.
 * Não muta o array original.
 *
 * @param {Array<{season_number: number, episodes: Array}>} seasons
 * @returns {Array}
 */
export function filterSeason0(seasons) {
  return seasons.filter(s => s.season_number !== 0);
}

/**
 * Retorna o próximo episódio não assistido da série.
 * Percorre seasons em ordem crescente, dentro de cada season percorre episódios em ordem.
 * Retorna `null` se a série estiver completa ou não houver episódios.
 *
 * @param {Set<string>} watchedKeys - chaves dos episódios assistidos
 * @param {Array<{season_number: number, episodes: Array<{season_number: number, episode_number: number}>}>} seasons
 * @param {number} seriesId
 * @returns {{season_number: number, episode_number: number} | null}
 */
export function getNextEpisode(watchedKeys, seasons, seriesId) {
  const sorted = [...seasons].sort((a, b) => a.season_number - b.season_number);

  for (const season of sorted) {
    const sortedEps = [...season.episodes].sort((a, b) => a.episode_number - b.episode_number);
    for (const ep of sortedEps) {
      const key = buildEpisodeKey(seriesId, ep.season_number, ep.episode_number);
      if (!watchedKeys.has(key)) {
        return { season_number: ep.season_number, episode_number: ep.episode_number };
      }
    }
  }

  return null;
}

/**
 * Calcula percentual de progresso da série (0-100, inteiro).
 *
 * @param {Set<string>} watchedKeys
 * @param {Array} seasons
 * @param {number} seriesId
 * @returns {number}
 */
export function calcProgressPercent(watchedKeys, seasons, seriesId) {
  const total = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  if (total === 0) return 0;

  const watched = seasons.reduce((acc, season) => {
    return acc + season.episodes.filter(ep =>
      watchedKeys.has(buildEpisodeKey(seriesId, ep.season_number, ep.episode_number))
    ).length;
  }, 0);

  return Math.floor((watched / total) * 100);
}

/**
 * Retorna true se todos os episódios de todas as seasons foram assistidos.
 *
 * @param {Set<string>} watchedKeys
 * @param {Array} seasons
 * @param {number} seriesId
 * @returns {boolean}
 */
export function isSeriesCompleted(watchedKeys, seasons, seriesId) {
  const total = seasons.reduce((acc, s) => acc + s.episodes.length, 0);
  if (total === 0) return false;
  return calcProgressPercent(watchedKeys, seasons, seriesId) === 100;
}
