import { IMG_BASE } from '../config/constants.js';

// Cada tipo do app e seus nomes. A cor de cada um é o token --type-<tipo> de style.css
export const MEDIA_KIND = {
  movie: { one: 'Filme', many: 'Filmes', a: 'Um filme' },
  tv: { one: 'Série', many: 'Séries', a: 'Uma série' },
  dorama: { one: 'Dorama', many: 'Doramas', a: 'Um dorama' },
};
export const MEDIA_TYPES = Object.keys(MEDIA_KIND);
export const isSeriesType = type => type === 'tv' || type === 'dorama';

// O TMDB não tem "dorama": é série coreana, e o app deixa a animação de fora
export const DORAMA_PARAMS = { with_origin_country: 'KR', without_genres: '16' };
export const isKorean = item => Array.isArray(item?.origin_country) && item.origin_country.includes('KR');

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

// Caminho de imagem do TMDB, como o banco aceita (CHECK em database/title_shares.sql e user_lists.sql): só isso vai para o banco e para o HTML
export const isPosterPath = path => typeof path === 'string' && /^\/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$/.test(path);

export function tmdbImage(path, size = 'w500') {
  return path ? `${IMG_BASE}${size}${path}` : '';
}

// Forma em que um título do TMDB é guardado na biblioteca e nas listas
export function toLibraryItem(item, fallbackType) {
  return { id: item.id, poster: item.poster_path, title: getTitle(item), type: item.media_type || fallbackType };
}

