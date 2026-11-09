// Liga a URL à interface: restaura ao abrir e atualiza a cada mudança (sem criar entrada no histórico)
import { parseUrlState, serializeUrlState } from '../domain/urlState.js';
import { state } from '../state/appState.js';
import { carregarDetalhes } from './titleModal.js';
import { selectPerson } from './discover.js';
import { rememberProviderValue } from './myProviders.js';
import { selecionarTipo, switchMode } from '../ui/navigation.js';
import { on } from '../state/events.js';
import { FILTER_FIELDS, filterValues } from '../ui/filterFields.js';


let ready = false; // nada grava antes de a URL inicial ser lida
let currentTitle = null;
let pendingTitle = null;

function syncUrl() {
  if (!ready) return;
  const search = serializeUrlState({
    mode: state.mode,
    type: state.type,
    ...filterValues(),
    personId: state.personId ? String(state.personId) : '',
    personName: state.personId ? state.personName : '',
    title: currentTitle,
  }, location.search);
  history.replaceState(null, '', `${location.pathname}${search}${location.hash}`);
}

on('mode:changed', syncUrl);
on('filters:changed', syncUrl);
on('type:changed', syncUrl);
on('title:opened', ({ item, mediaType }) => setUrlTitle({ type: mediaType, id: item.id }));
on('title:closed', () => setUrlTitle(null));

function setUrlTitle(title) {
  currentTitle = title;
  syncUrl();
}

export function initUrlState() {
  const initial = parseUrlState(location.search);
  if (initial.mode) switchMode(initial.mode);
  if (initial.type) selecionarTipo(initial.type);
  Object.entries(FILTER_FIELDS).forEach(([key, id]) => {
    if (initial[key]) document.getElementById(id).value = initial[key];
  });
  rememberProviderValue();
  if (initial.personId) selectPerson(Number(initial.personId), initial.personName || 'Pessoa selecionada');

  pendingTitle = initial.title || null;
  currentTitle = pendingTitle;
  ready = true;

  Object.values(FILTER_FIELDS).forEach(id => {
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
