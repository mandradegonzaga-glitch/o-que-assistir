// Estado compartilhável na URL (modo, tipo, filtros e título aberto) em português, sem depender do DOM.
import { MOODS } from './moods.js';
import { isCountry } from './countries.js';
import { MEDIA_TYPES } from './mediaItem.js';
import { isGenreFilter, isProviderFilter } from './filters.js';
import { MODES } from './screens.js';

const FIELDS = {
  mode: 'modo',
  type: 'tipo',
  genre: 'genero',
  mood: 'clima',
  provider: 'onde',
  duration: 'duracao',
  rating: 'nota',
  similar: 'parecido',
  yearFrom: 'de',
  yearTo: 'ate',
  personId: 'pessoa',
  personName: 'pessoaNome',
  country: 'pais',
};
const DEFAULTS = { mode: 'discover', type: 'movie' };
const DURATIONS = ['short', 'medium', 'long'];
export const MIN_RATINGS = ['6', '7', '8']; // nota mínima do TMDB (6+, 7+, 8+)
const TITLE_PATTERN = /^(movie|tv|dorama)-(\d+)$/;

// Valores inválidos (link editado à mão) são ignorados em vez de quebrar o app
export function parseUrlState(search) {
  const params = new URLSearchParams(search);
  const result = {};
  Object.entries(FIELDS).forEach(([key, name]) => {
    const value = params.get(name);
    if (value) result[key] = value;
  });

  if (result.mode && !MODES.includes(result.mode)) delete result.mode;
  if (result.type && !MEDIA_TYPES.includes(result.type)) delete result.type;
  if (result.duration && !DURATIONS.includes(result.duration)) delete result.duration;
  if (result.rating && !MIN_RATINGS.includes(result.rating)) delete result.rating;
  if (result.genre && !isGenreFilter(result.genre)) delete result.genre;
  if (result.provider && !isProviderFilter(result.provider)) delete result.provider;
  if (result.mood && !(result.mood in MOODS)) delete result.mood;
  if (result.country && !isCountry(result.country)) delete result.country;
  ['yearFrom', 'yearTo'].forEach(key => {
    if (result[key] && !/^\d{4}$/.test(result[key])) delete result[key];
  });
  if (result.personId && !/^\d+$/.test(result.personId)) {
    delete result.personId;
    delete result.personName;
  }

  const title = params.get('titulo')?.match(TITLE_PATTERN);
  if (title) result.title = { type: title[1], id: Number(title[2]) };

  return result;
}

// Parte da query atual: parâmetros que não são do app continuam na URL
export function serializeUrlState(state, currentSearch = '') {
  const params = new URLSearchParams(currentSearch);
  Object.entries(FIELDS).forEach(([key, name]) => {
    const value = state[key];
    if (value && value !== DEFAULTS[key]) params.set(name, value);
    else params.delete(name);
  });
  if (state.title) params.set('titulo', `${state.title.type}-${state.title.id}`);
  else params.delete('titulo');
  const query = params.toString();
  return query ? `?${query}` : '';
}
