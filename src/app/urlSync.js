// Liga a URL à interface: restaura ao abrir e atualiza a cada mudança (sem criar entrada no histórico)
import { parseUrlState, serializeUrlState } from '../domain/urlState.js';
import { state } from '../state/appState.js';
import { carregarDetalhes } from './titleModal.js';
import { setFilters } from './filters.js';
import { selecionarTipo, switchMode } from '../ui/navigation.js';
import { on } from '../state/events.js';
import { FILTER_FIELDS } from '../ui/filterFields.js';

let ready = false; // nada grava antes de a URL inicial ser lida
let currentTitle = null;
let pendingTitle = null;

function syncUrl() {
  if (!ready) return;
  const search = serializeUrlState({
    mode: state.mode,
    type: state.type,
    ...state.filters,
    personId: state.filters.personId ? String(state.filters.personId) : '',
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
  const fromUrl = Object.fromEntries(Object.keys(FILTER_FIELDS).filter(key => initial[key]).map(key => [key, initial[key]]));
  if (initial.personId) Object.assign(fromUrl, { personId: Number(initial.personId), personName: initial.personName || 'Pessoa selecionada' });
  setFilters(fromUrl);

  pendingTitle = initial.title || null;
  currentTitle = pendingTitle;
  ready = true;
  syncUrl();
}

// O título do link espera o login/convidado: o modal não pode abrir atrás da tela de entrada
export function openTitleFromUrl() {
  if (!pendingTitle) return;
  const { id, type } = pendingTitle;
  pendingTitle = null;
  carregarDetalhes(id, type);
}
