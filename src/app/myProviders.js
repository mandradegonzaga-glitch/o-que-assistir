// "Minhas plataformas": os streamings que a pessoa assina, guardados neste aparelho.
import { supabaseUpdateUserData } from '../api/supabase.js';
import { tmdbGet } from '../api/tmdb.js';
import { session } from '../state/appState.js';
import { MY_PROVIDERS_VALUE, normalizeProviderIds } from '../domain/filters.js';
import { FEATURED_PROVIDERS, buildOtherProviders, matchesProviderSearch } from '../domain/providers.js';
import { storage } from '../utils/storage.js';
import { abrirPerfil } from './profile.js';
import { syncUrl } from './urlSync.js';

const STORAGE_KEY = 'my_providers';
const LIST_TTL_MS = 24 * 60 * 60 * 1000;
const CHOOSE_VALUE = 'escolher';

let otherProviders = [];
let listLoaded = false;
let lastProviderValue = '';
let optionsReady = false;

function providerSelect() {
  return document.getElementById('input-provider');
}

export function getMyProviders() {
  return normalizeProviderIds(storage.get(STORAGE_KEY, []));
}

// Valor do filtro "Onde" pronto para a busca: "minhas" vira a lista de ids
export function resolveProviderFilter() {
  const value = providerSelect().value;
  return value === MY_PROVIDERS_VALUE ? getMyProviders().join('|') : value;
}

// A opção só existe com algo marcado; escolher plataformas passa a filtrar por elas
function syncProviderOption(selectIt) {
  const select = providerSelect();
  const existing = select.querySelector(`option[value="${MY_PROVIDERS_VALUE}"]`);
  const hasProviders = getMyProviders().length > 0;

  select.querySelector(`option[value="${CHOOSE_VALUE}"]`).textContent = hasProviders ? 'Editar minhas plataformas...' : 'Escolher minhas plataformas...';

  if (!hasProviders) {
    const wasSelected = select.value === MY_PROVIDERS_VALUE;
    existing?.remove();
    if (wasSelected) select.value = '';
  } else {
    if (!existing) {
      const option = document.createElement('option');
      option.value = MY_PROVIDERS_VALUE;
      option.textContent = 'Minhas plataformas';
      select.insertBefore(option, select.options[1] || null);
    }
    if (selectIt) select.value = MY_PROVIDERS_VALUE;
  }
  lastProviderValue = select.value;
  syncUrl();
}

function addProviderOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  providerSelect().append(option);
}

// A última opção não é um filtro: leva para a escolha no perfil e mantém o filtro anterior
export function onProviderChange(select) {
  if (select.value !== CHOOSE_VALUE) {
    lastProviderValue = select.value;
    return;
  }
  select.value = lastProviderValue;
  syncUrl();
  abrirPerfil();
  document.getElementById('my-providers').closest('.profile-section').scrollIntoView({ block: 'start' });
}

function providerChoice({ id, name }, mine) {
  const label = document.createElement('label');
  label.className = 'provider-choice';
  label.dataset.name = name;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.value = id;
  input.checked = mine.includes(id);
  input.dataset.change = 'toggleMyProvider';
  const text = document.createElement('span');
  text.textContent = name;
  label.append(input, text);
  return label;
}

// O que já foi marcado fica sempre à vista, mesmo fora dos destaques
function renderChoices() {
  const mine = getMyProviders();
  const selectedOthers = otherProviders.filter(p => mine.includes(p.id));
  const rest = otherProviders.filter(p => !mine.includes(p.id));

  document.getElementById('my-providers')
    .replaceChildren(...[...FEATURED_PROVIDERS, ...selectedOthers].map(p => providerChoice(p, mine)));
  document.getElementById('all-providers')
    .replaceChildren(...rest.map(p => providerChoice(p, mine)));
  document.getElementById('more-providers').hidden = rest.length === 0;
  filterProviders(document.getElementById('provider-search'));
}

export function filterProviders(input) {
  const query = input.value;
  let visible = 0;
  document.querySelectorAll('#all-providers .provider-choice').forEach(label => {
    const match = matchesProviderSearch(label.dataset.name, query);
    label.hidden = !match;
    if (match) visible++;
  });
  document.getElementById('providers-empty').hidden = visible > 0;
}

// Sem resposta do TMDB, os destaques continuam funcionando; tenta de novo ao reabrir o perfil
export async function loadAllProviders() {
  if (listLoaded) return;
  try {
    const options = { language: 'pt-BR', watch_region: 'BR' };
    const ttl = { ttl: LIST_TTL_MS };
    const [movie, tv] = await Promise.all([
      tmdbGet('/watch/providers/movie', options, ttl),
      tmdbGet('/watch/providers/tv', options, ttl),
    ]);
    otherProviders = buildOtherProviders(movie.results || [], tv.results || []);
    listLoaded = true;
    renderChoices();
  } catch (e) {
    console.error('Erro ao carregar plataformas:', e);
  }
}

export function toggleMyProvider(input) {
  const mine = new Set(getMyProviders());
  if (input.checked) mine.add(input.value);
  else mine.delete(input.value);
  storage.set(STORAGE_KEY, [...mine]);
  syncProviderOption(input.checked);
  if (hasAccount()) supabaseUpdateUserData({ my_providers: [...mine] });
}

function hasAccount() {
  return Boolean(session.currentUserId) && session.currentUser !== 'guest';
}

// A conta vence o aparelho; a primeira vez, o que já estava marcado aqui sobe para a conta
export function syncProvidersWithAccount() {
  if (!hasAccount()) return;
  const saved = session.currentUser?.user_metadata?.my_providers;
  if (Array.isArray(saved)) {
    storage.set(STORAGE_KEY, normalizeProviderIds(saved));
    if (optionsReady) {
      renderChoices();
      syncProviderOption(false);
    }
  } else if (getMyProviders().length > 0) {
    supabaseUpdateUserData({ my_providers: getMyProviders() });
  }
}

// Um link pode trazer outro filtro: é ele que "Escolher..." deve manter
export function rememberProviderValue() {
  lastProviderValue = providerSelect().value;
}

export function initMyProviders() {
  FEATURED_PROVIDERS.forEach(p => addProviderOption(p.id, p.name));
  addProviderOption(CHOOSE_VALUE, '');
  optionsReady = true;
  renderChoices();
  syncProviderOption(true);
}
