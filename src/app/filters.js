// Os filtros escolhidos, prontos para o TMDB: sorteio, Top 10, lançamentos, Match, batalha e
// sessão às escuras pedem títulos com as mesmas regras.
import { buildDiscoverUrl, getRandomPage } from '../domain/filters.js';
import { tmdbFetch } from '../api/tmdb.js';
import { MEDIA_KIND, getTmdbEndpoint } from '../domain/mediaItem.js';
import { state } from '../state/appState.js';
import { filterField, filterValue, filterValues } from '../ui/filterFields.js';
import { resolveProviderFilter } from './myProviders.js';

function filterOptions() {
  const { genre, mood, duration, yearFrom, yearTo, country } = filterValues();
  return { genre, mood, provider: resolveProviderFilter(), duration, yearFrom, yearTo, personId: state.personId, country };
}

// overrides: o que um modo ignora ou muda (ex.: Top 10 sem duração nem pessoa, minVotes próprio)
export function discoverUrl(overrides = {}) {
  return buildDiscoverUrl(getTmdbEndpoint(state.type), { ...filterOptions(), isDorama: state.type === 'dorama', ...overrides });
}

// Uma página ao acaso, para variar; vazia (filtros estreitos têm poucas páginas), a primeira
export async function fetchRandomPage(url, maxPage) {
  const data = await tmdbFetch(`${url}&page=${getRandomPage(maxPage)}`);
  if (data.results?.length) return data.results;
  return (await tmdbFetch(`${url}&page=1`)).results || [];
}

// O que define uma lista aberta: mudou algo desde que abriu?
export function filtersKey() {
  return JSON.stringify([state.type, state.personId, filterValues()]);
}

// "Filmes · Terror · Netflix": os filtros que estão valendo, para mostrar dentro dos modos que os usam
export function filtersSummary() {
  const chosen = key => {
    const el = filterField(key);
    return el && el.value && !el.disabled ? el.selectedOptions[0].textContent.trim() : '';
  };
  const from = filterValue('yearFrom');
  const to = filterValue('yearTo');
  const years = from && to ? `${from} a ${to}` : from ? `desde ${from}` : to ? `até ${to}` : '';
  const person = state.personId ? state.personName : '';
  const parts = [person, chosen('mood'), chosen('genre'), chosen('provider'), chosen('duration'), chosen('country'), years].filter(Boolean);
  return [MEDIA_KIND[state.type].many, ...(parts.length ? parts : ['todos os gêneros'])].join(' · ');
}
