// Episódios assistidos: conta grava no Supabase; convidado, neste aparelho (mesmo formato de chave).
// Chave de episódio: "{seriesId}-s{temporada}-e{episódio}".
import { supabase, supabaseGetAllSeriesInProgress, supabaseGetSeriesProgress, supabaseMarkEpisodesWatched, supabaseMarkEpisodeWatched, supabaseUnmarkEpisodeWatched } from '../api/supabase.js';
import { session } from '../state/appState.js';
import { storage } from '../utils/storage.js';
import { GUEST_EPISODES_KEY } from './guestLibrary.js';

const isGuest = () => session.currentUser === 'guest';
const keyOf = (seriesId, season, episode) => `${seriesId}-s${season}-e${episode}`;

// { [seriesId]: { id, title, poster, type, keys: [], updatedAt } }
function readGuest() {
  const data = storage.get(GUEST_EPISODES_KEY, {});
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

const writeGuest = data => storage.set(GUEST_EPISODES_KEY, data);

export const canTrackEpisodes = () => isGuest() || !!session.currentUserId;

export async function getSeriesProgress(seriesId) {
  if (isGuest()) return { success: true, watchedKeys: new Set(readGuest()[seriesId]?.keys || []) };
  return supabaseGetSeriesProgress(session.currentUserId, seriesId);
}

function addGuestKeys(series, episodes) {
  const data = readGuest();
  const entry = data[series.id] || { id: series.id, keys: [] };
  const keys = new Set(entry.keys);
  episodes.forEach(ep => keys.add(keyOf(series.id, ep.season_number, ep.episode_number)));
  data[series.id] = { ...entry, title: series.title, poster: series.poster || null, type: series.type || 'tv', keys: [...keys], updatedAt: Date.now() };
  writeGuest(data);
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
  const data = readGuest();
  const entry = data[seriesId];
  if (entry) {
    entry.keys = entry.keys.filter(k => k !== keyOf(seriesId, season, episode));
    if (entry.keys.length) data[seriesId] = entry;
    else delete data[seriesId];
    writeGuest(data);
  }
  return { success: true };
}

// Séries com pelo menos um episódio, da mais recente para a mais antiga
export async function getAllSeriesInProgress() {
  if (!isGuest()) return supabaseGetAllSeriesInProgress(session.currentUserId);
  const series = Object.values(readGuest())
    .filter(s => s?.keys?.length)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map(s => ({ id: s.id, title: s.title, poster: s.poster, type: s.type, watchedKeys: new Set(s.keys) }));
  return { success: true, series };
}

export async function clearSeries(seriesId) {
  if (!isGuest()) {
    await supabase.from('episode_progress').delete().eq('user_id', session.currentUserId).eq('series_id', seriesId);
    return;
  }
  const data = readGuest();
  delete data[seriesId];
  writeGuest(data);
}
