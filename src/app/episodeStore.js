// Episódios assistidos: conta grava no Supabase; convidado, neste aparelho (mesmo formato de chave).
// Chave de episódio: "{seriesId}-s{temporada}-e{episódio}".
import { supabaseClearSeriesProgress, supabaseGetAllSeriesInProgress, supabaseGetSeriesProgress, supabaseMarkEpisodesWatched, supabaseMarkEpisodeWatched, supabaseUnmarkEpisodeWatched } from '../api/supabase.js';
import { isGuest, session } from '../state/appState.js';
import { getGuestEpisodes, saveGuestEpisodes } from './guestLibrary.js';
import { buildEpisodeKey } from '../domain/seriesProgress.js';



export const canTrackEpisodes = () => isGuest() || !!session.currentUserId;

export async function getSeriesProgress(seriesId) {
  if (isGuest()) return { success: true, watchedKeys: new Set(getGuestEpisodes()[seriesId]?.keys || []) };
  return supabaseGetSeriesProgress(session.currentUserId, seriesId);
}

function addGuestKeys(series, episodes) {
  const data = getGuestEpisodes();
  const entry = data[series.id] || { id: series.id, keys: [] };
  const keys = new Set(entry.keys);
  episodes.forEach(ep => keys.add(buildEpisodeKey(series.id, ep.season_number, ep.episode_number)));
  data[series.id] = { ...entry, title: series.title, poster: series.poster || null, type: series.type || 'tv', keys: [...keys], updatedAt: Date.now() };
  saveGuestEpisodes(data);
  return { success: true };
}

export async function markEpisode(series, season, episode) {
  if (!isGuest()) return supabaseMarkEpisodeWatched(session.currentUserId, series, season, episode);
  return addGuestKeys(series, [{ season_number: season, episode_number: episode }]);
}

// Vários de uma vez (temporada, série inteira): um pedido só para a conta
export async function markEpisodes(series, episodes) {
  if (!isGuest()) return supabaseMarkEpisodesWatched(session.currentUserId, series, episodes);
  return addGuestKeys(series, episodes);
}

export async function unmarkEpisode(seriesId, season, episode) {
  if (!isGuest()) return supabaseUnmarkEpisodeWatched(session.currentUserId, seriesId, season, episode);
  const data = getGuestEpisodes();
  const entry = data[seriesId];
  if (entry) {
    entry.keys = entry.keys.filter(k => k !== buildEpisodeKey(seriesId, season, episode));
    if (entry.keys.length) data[seriesId] = entry;
    else delete data[seriesId];
    saveGuestEpisodes(data);
  }
  return { success: true };
}

// Séries com pelo menos um episódio, da mais recente para a mais antiga
export async function getAllSeriesInProgress() {
  if (!isGuest()) return supabaseGetAllSeriesInProgress(session.currentUserId);
  const series = Object.values(getGuestEpisodes())
    .filter(s => s?.keys?.length)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map(s => ({ id: s.id, title: s.title, poster: s.poster, type: s.type, watchedKeys: new Set(s.keys) }));
  return { success: true, series };
}

export async function clearSeries(seriesId) {
  if (!isGuest()) {
    await supabaseClearSeriesProgress(session.currentUserId, seriesId);
    return;
  }
  const data = getGuestEpisodes();
  delete data[seriesId];
  saveGuestEpisodes(data);
}
