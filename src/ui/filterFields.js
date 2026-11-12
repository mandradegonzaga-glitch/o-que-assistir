// Os campos de filtro da tela de descobrir (ids no index.html). Um campo novo entra nesta lista
// e em `emptyFilters` (appState); os valores valem em `state.filters`, os campos só os mostram.
export const FILTER_FIELDS = {
  genre: 'input-genero',
  mood: 'input-mood',
  provider: 'input-provider',
  duration: 'duration-select',
  rating: 'input-rating',
  similar: 'input-similar',
  yearFrom: 'year-from',
  yearTo: 'year-to',
  country: 'input-country',
};

export const filterField = key => document.getElementById(FILTER_FIELDS[key]);
