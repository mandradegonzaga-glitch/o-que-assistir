// Liga a URL à interface: restaura ao abrir e atualiza a cada mudança (sem criar entrada no histórico)
import { parseUrlState, serializeUrlState } from '../domain/urlState.js';
import { state } from '../state/appState.js';
import { carregarDetalhes } from './titleModal.js';
import { selectPerson } from './discover.js';
import { rememberProviderValue } from './myProviders.js';
import { selecionarTipo, switchMode } from '../ui/navigation.js';

const FIELD_IDS = {
  genre: 'input-genero',
  mood: 'input-mood',
  provider: 'input-provider',
  duration: 'duration-select',
  similar: 'input-similar',
  yearFrom: 'year-from',
  yearTo: 'year-to',
  country: 'input-country',
};

let ready = false; // nada grava antes de a URL inicial ser lida
let currentTitle = null;
let pendingTitle = null;

function readFields() {
  return Object.fromEntries(Object.entries(FIELD_IDS).map(([key, id]) => [key, document.getElementById(id).value.trim()]));
}

export function syncUrl() {
  if (!ready) return;
  const mode = ['roulette', 'match'].find(m => document.getElementById(`view-${m}`).style.display === 'block') || 'discover';
  const search = serializeUrlState({
    mode,
    type: state.type,
    ...readFields(),
    personId: state.personId ? String(state.personId) : '',
    personName: state.personId ? document.getElementById('person-name').textContent : '',
    title: currentTitle,
  }, location.search);
  history.replaceState(null, '', `${location.pathname}${search}${location.hash}`);
}

export function setUrlTitle(title) {
  currentTitle = title;
  syncUrl();
}

export function initUrlState() {
  const initial = parseUrlState(location.search);
  if (initial.mode) switchMode(initial.mode);
  if (initial.type) selecionarTipo(initial.type);
  Object.entries(FIELD_IDS).forEach(([key, id]) => {
    if (initial[key]) document.getElementById(id).value = initial[key];
  });
  rememberProviderValue();
  if (initial.personId) selectPerson(Number(initial.personId), initial.personName || 'Pessoa selecionada');

  pendingTitle = initial.title || null;
  currentTitle = pendingTitle;
  ready = true;

  Object.values(FIELD_IDS).forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', syncUrl);
  });
  syncUrl();
}

// O título do link espera o login/convidado: o modal não pode abrir atrás da tela de entrada
export function openTitleFromUrl() {
  if (!pendingTitle) return;
  const { id, type } = pendingTitle;
  pendingTitle = null;
  carregarDetalhes(id, type);
}
