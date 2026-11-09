// Os campos de filtro da tela de descobrir (ids no index.html). Quem lê filtros passa por aqui:
// um campo novo entra só nesta lista.
export const FILTER_FIELDS = {
  genre: 'input-genero',
  mood: 'input-mood',
  provider: 'input-provider',
  duration: 'duration-select',
  similar: 'input-similar',
  yearFrom: 'year-from',
  yearTo: 'year-to',
  country: 'input-country',
};

export const filterField = key => document.getElementById(FILTER_FIELDS[key]);
export const filterValue = key => filterField(key)?.value.trim() || '';

export function filterValues() {
  return Object.fromEntries(Object.keys(FILTER_FIELDS).map(key => [key, filterValue(key)]));
}
