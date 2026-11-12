// "Minhas plataformas": os streamings que a pessoa assina (no aparelho; com conta, também na conta).
import { readAccountData, writeAccountData } from './accountData.js';
import { tmdbGet } from '../api/tmdb.js';
import { isAccount } from '../state/appState.js';
import { CHOOSE_PROVIDERS_VALUE, MY_PROVIDERS_VALUE, normalizeProviderIds } from '../domain/filters.js';
import { FEATURED_PROVIDERS, buildOtherProviders, matchesProviderSearch } from '../domain/providers.js';
import { storage } from '../utils/storage.js';
import { abrirPerfil } from './profile.js';
import { DAY_MS } from '../utils/date.js';
import { emit, on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';

const STORAGE_KEY = 'my_providers';
const LIST_TTL_MS = DAY_MS;

let otherProviders = [];
let listLoaded = false;
let optionsReady = false;

function providerSelect() {
  return document.getElementById('input-provider');
}

function getMyProviders() {
  return normalizeProviderIds(storage.get(STORAGE_KEY, []));
}

// Valor do filtro "Onde" pronto para a busca: "minhas" vira a lista de ids
export function resolveProviderFilter(value) {
  return value === MY_PROVIDERS_VALUE ? getMyProviders().join('|') : value;
}

// A opção só existe com algo marcado; escolher plataformas passa a filtrar por elas (app/filters.js)
function syncProviderOption(selectIt) {
  const select = providerSelect();
  const existing = select.querySelector(`option[value="${MY_PROVIDERS_VALUE}"]`);
  const hasProviders = getMyProviders().length > 0;

  select.querySelector(`option[value="${CHOOSE_PROVIDERS_VALUE}"]`).textContent = hasProviders ? 'Editar minhas plataformas…' : 'Escolher minhas plataformas…';

  if (!hasProviders) {
    existing?.remove();
  } else if (!existing) {
    const option = document.createElement('option');
    option.value = MY_PROVIDERS_VALUE;
    option.textContent = 'Minhas plataformas';
    select.insertBefore(option, select.options[1] || null);
  }
  emit('providers:changed', { select: selectIt && hasProviders });
}

function addProviderOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  providerSelect().append(option);
}

// "Escolher minhas plataformas" no filtro: o filtro fica como estava (app/filters.js) e o perfil abre nelas
on('providers:choose', () => {
  abrirPerfil();
  document.getElementById('my-providers').closest('.profile-section').scrollIntoView({ block: 'start' });
});

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

function filterProviders(input) {
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
// O perfil mostra a escolha de provedores com a lista completa
on('profile:opened', loadAllProviders);

async function loadAllProviders() {
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

function toggleMyProvider(input) {
  const mine = new Set(getMyProviders());
  if (input.checked) mine.add(input.value);
  else mine.delete(input.value);
  storage.set(STORAGE_KEY, [...mine]);
  syncProviderOption(input.checked);
  writeAccountData({ my_providers: [...mine] });
}

// Escolha de uma vez (primeira visita): guarda, passa a filtrar por elas e sobe para a conta
export function setMyProviders(ids) {
  storage.set(STORAGE_KEY, normalizeProviderIds(ids));
  if (optionsReady) renderChoices();
  syncProviderOption(true);
  writeAccountData({ my_providers: getMyProviders() });
}

// A conta guarda os provedores: entrar em outro aparelho traz os mesmos.
// A conta vence o aparelho; a primeira vez, o que já estava marcado aqui sobe para a conta.
on('session:started', ({ kind }) => kind === 'account' && syncProvidersWithAccount());
// Os da conta não ficam no aparelho: a próxima conta a entrar receberia os provedores de outra pessoa
on('session:ended', ({ kind }) => {
  if (kind !== 'account') return;
  storage.set(STORAGE_KEY, []);
  if (optionsReady) {
    renderChoices();
    syncProviderOption(false);
  }
});

function syncProvidersWithAccount() {
  if (!isAccount()) return;
  const saved = readAccountData('my_providers');
  if (Array.isArray(saved)) {
    storage.set(STORAGE_KEY, normalizeProviderIds(saved));
    if (optionsReady) {
      renderChoices();
      syncProviderOption(false);
    }
  } else if (getMyProviders().length > 0) {
    writeAccountData({ my_providers: getMyProviders() });
  }
}

export function initMyProviders() {
  FEATURED_PROVIDERS.forEach(p => addProviderOption(p.id, p.name));
  addProviderOption(CHOOSE_PROVIDERS_VALUE, '');
  optionsReady = true;
  renderChoices();
  syncProviderOption(true);
}

registerActions({
  input: {
    filterProviders,
  },
  change: {
    toggleMyProvider,
  },
});
