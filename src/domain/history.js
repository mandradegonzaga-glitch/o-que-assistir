import { MAX_SORTEIO_HISTORY } from '../config/constants.js';
import { getTitle, withRating } from './mediaItem.js';

export function deduplicateHistory(history, newItem) {
  const filtered = history.filter(item => item.id !== newItem.id);
  return [newItem, ...filtered];
}

export function trimHistory(history, maxSize = MAX_SORTEIO_HISTORY) {
  return history.slice(0, maxSize);
}

export function createSorteioEntry(tmdbItem) {
  return {
    id: tmdbItem.id,
    title: getTitle(tmdbItem),
    poster_path: tmdbItem.poster_path || null,
    media_type: tmdbItem.media_type || 'movie'
  };
}

export function createWatchedEntry(tmdbItem, mediaType, now = new Date()) {
  const date = tmdbItem.release_date || tmdbItem.first_air_date || '';
  return withRating({
    id: tmdbItem.id,
    title: getTitle(tmdbItem),
    poster: tmdbItem.poster_path || null,
    type: mediaType || tmdbItem.media_type || 'movie',
    year: date.split('-')[0] || '',
    genres: tmdbItem.genre_ids || tmdbItem.genres?.map(g => g.id) || [],
    watchedAt: now.toISOString(),
  }, tmdbItem);
}
