import { IMG_BASE } from '../config/constants.js';

export const MEDIA_TYPES = ['movie', 'tv', 'dorama'];

export function getTitle(item) {
  return item.title || item.name || '';
}

export function getYear(item) {
  const date = item.release_date || item.first_air_date || '';
  return date.split('-')[0] || '';
}

// Dorama é uma vitrine do app; no TMDB é série
export function getTmdbEndpoint(appType) {
  return appType === 'dorama' ? 'tv' : appType;
}

export function tmdbImage(path, size = 'w500') {
  return path ? `${IMG_BASE}${size}${path}` : '';
}

// Forma em que um título do TMDB é guardado na biblioteca e nas listas
export function toLibraryItem(item, fallbackType) {
  return { id: item.id, poster: item.poster_path, title: getTitle(item), type: item.media_type || fallbackType };
}

