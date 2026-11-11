// Os filtros de descobrir têm um dono só. Os valores ficam em `state.filters` e mudam por
// `setFilters`, que aplica as regras (gênero e clima se excluem), atualiza os campos da tela e
// avisa 'filters:changed' uma vez. URL, pílulas e resumo escutam o aviso.
// Eles também saem daqui prontos para o TMDB: sorteio, Top 10, lançamentos, Match, batalha e
// sessão às escuras pedem títulos com as mesmas regras.
import { CHOOSE_PROVIDERS_VALUE, MY_PROVIDERS_VALUE, discoverRequest as buildRequest, getRandomPage } from '../domain/filters.js';
import { tmdbGet } from '../api/tmdb.js';
import { MEDIA_KIND } from '../domain/mediaItem.js';
import { state } from '../state/appState.js';
import { emit, on } from '../state/events.js';
import { FILTER_FIELDS, filterField } from '../ui/filterFields.js';
import { resolveProviderFilter } from './myProviders.js';
import { joinMeta } from '../utils/format.js';

const readField = el => el.value.trim();

// O campo mostra o valor; um <select> sem aquela opção fica vazio, e o vazio é o que vale
function showInFields(filters) {
  Object.keys(FILTER_FIELDS).forEach(key => {
    const el = filterField(key);
    if (!el) return;
    if (readField(el) !== filters[key]) el.value = filters[key];
    filters[key] = readField(el);
  });
}

export function setFilters(changes) {
  const next = { ...state.filters, ...changes };
  if (changes.genre && !('mood' in changes)) next.mood = '';
  if (changes.mood && !('genre' in changes)) next.genre = '';
  if (!next.personId) {
    next.personId = null;
    next.personName = '';
  }
  showInFields(next);
  if (JSON.stringify(next) === JSON.stringify(state.filters)) return;
  state.filters = next;
  emit('filters:changed');
}

// O que a pessoa mexe nos campos passa pelas mesmas regras
function onFieldEdit(key, el) {
  if (key === 'provider' && el.value === CHOOSE_PROVIDERS_VALUE) {
    el.value = state.filters.provider;
    emit('providers:choose');
    return;
  }
  setFilters({ [key]: readField(el) });
}

// As opções de "Onde assistir" mudaram: "Minhas plataformas" pode ter sumido ou acabado de ser escolhida
on('providers:changed', ({ select }) => setFilters({ provider: select ? MY_PROVIDERS_VALUE : state.filters.provider }));

export function initFilters() {
  Object.keys(FILTER_FIELDS).forEach(key => {
    const el = filterField(key);
    el?.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => onFieldEdit(key, el));
  });
}

function filterOptions() {
  const { genre, mood, duration, yearFrom, yearTo, personId, country } = state.filters;
  return { genre, mood, provider: resolveProviderFilter(state.filters.provider), duration, yearFrom, yearTo, personId, country };
}

// overrides: o que um modo ignora ou muda (ex.: Top 10 sem duração nem pessoa, minVotes próprio)
export function discoverRequest(overrides = {}) {
  return buildRequest(state.type, { ...filterOptions(), ...overrides });
}

export function fetchDiscover({ path, params }, page) {
  return tmdbGet(path, { ...params, page });
}

// Uma página ao acaso, para variar. Filtros estreitos têm poucas páginas: se ela não trouxer `min`
// títulos que sirvam (`keep`), junta os da primeira.
export async function fetchRandomPage(request, { maxPage, min = 1, keep = () => true } = {}) {
  const page = getRandomPage(maxPage);
  const found = new Map();
  for (const n of page === 1 ? [1] : [page, 1]) {
    ((await fetchDiscover(request, n)).results || []).filter(keep).forEach(item => found.set(item.id, item));
    if (found.size >= min) break;
  }
  return [...found.values()];
}

// O que define uma lista aberta: mudou algo desde que abriu?
export function filtersKey() {
  return JSON.stringify([state.type, state.filters]);
}

// "Filmes · Terror · Netflix": os filtros que estão valendo, para mostrar dentro dos modos que os usam
export function filtersSummary() {
  const chosen = key => {
    const el = filterField(key);
    return el && el.value && !el.disabled ? el.selectedOptions[0].textContent.trim() : '';
  };
  const { yearFrom: from, yearTo: to, personName } = state.filters;
  const years = from && to ? `${from} a ${to}` : from ? `desde ${from}` : to ? `até ${to}` : '';
  const parts = [personName, chosen('mood'), chosen('genre'), chosen('provider'), chosen('duration'), chosen('country'), years].filter(Boolean);
  return joinMeta([MEDIA_KIND[state.type].many, ...(parts.length ? parts : ['todos os gêneros'])]);
}
