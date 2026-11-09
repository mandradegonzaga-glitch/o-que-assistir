export function buildEpisodeKey(seriesId, seasonNumber, episodeNumber) {
  return `${seriesId}-s${seasonNumber}-e${episodeNumber}`;
}

export function episodeCode(season, episode) {
  return `T${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
}

export function parseEpisodeKey(key) {
  const [, seriesId, season, episode] = /^(\d+)-s(\d+)-e(\d+)$/.exec(key) || [];
  return seriesId ? { seriesId: Number(seriesId), season: Number(season), episode: Number(episode) } : null;
}

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
