// Filtros em pílulas (Clima, Gênero, Onde assistir, Duração) e o "Mais filtros".
// Tocar numa pílula escolhe no <select> escondido, como a pessoa faria; app/filters.js aplica as
// regras e avisa 'filters:changed', e só aí as pílulas e o resumo se redesenham.
import { featuredProviderLogos } from '../api/providerLogos.js';
import { IMG_URL } from '../config/constants.js';
import { MAIN_GENRE_IDS } from '../domain/genres.js';
import { state } from '../state/appState.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { on } from '../state/events.js';
import { storage } from '../utils/storage.js';
import { joinMeta } from '../utils/format.js';
import { FILTER_FIELDS, filterField } from './filterFields.js';
import { CHOOSE_PROVIDERS_VALUE as CHOOSE, MY_PROVIDERS_VALUE } from '../domain/filters.js';

const OPEN_KEY = 'filters_open'; // aberto ou recolhido, lembrado neste aparelho

// Nomes curtos para caber na pílula; o resto usa o texto da própria opção
const LABELS = {
  'input-mood': { '': 'Qualquer', leve: 'Leve e divertido', chorar: 'Para chorar', imaginacao: 'Imaginação' },
  'input-genero': { '': 'Todos' },
  'input-provider': { '': 'Todas', [MY_PROVIDERS_VALUE]: 'Minhas plataformas' },
  'duration-select': { '': 'Qualquer', short: 'Até 1h30', medium: '1h30 a 2h', long: 'Mais de 2h' },
  'input-rating': { '': 'Qualquer', 6: '★ 6+', 7: '★ 7+', 8: '★ 8+' },
};

// Gêneros à vista antes do "Ver todos"; o escolhido aparece sempre
const MAIN_GENRES = [...MAIN_GENRE_IDS.map(String), 'natal'];

const providerLogos = new Map(); // id → caminho do logo no TMDB
const renderers = new Map();

function labelOf(selectId, option) {
  return LABELS[selectId]?.[option.value] ?? option.textContent.trim();
}

function chipHtml(selectId, option, checked) {
  const label = labelOf(selectId, option);
  const logo = selectId === 'input-provider' ? providerLogos.get(option.value) : null;
  const attrs = `type="button" role="radio" aria-checked="${checked}" tabindex="${checked ? 0 : -1}" data-value="${escapeHtml(option.value)}"`;
  if (logo) {
    return `<button ${attrs} class="chip chip--logo" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><img src="${IMG_URL + logo}" alt="" width="40" height="40" loading="lazy"></button>`;
  }
  return `<button ${attrs} class="chip">${escapeHtml(label)}</button>`;
}

function render(select, group) {
  const id = select.id;
  const options = [...select.options];
  const choices = options.filter(o => o.value !== CHOOSE);
  let shown = choices;
  let more = '';
  if (id === 'input-genero' && group.dataset.expanded !== 'true') {
    shown = choices.filter(o => o.value === '' || MAIN_GENRES.includes(o.value) || o.value === select.value);
    const hiddenCount = choices.length - shown.length;
    if (hiddenCount > 0) more = `<button type="button" class="chip chip--more" data-chips-expand aria-expanded="false">Ver todos (+${hiddenCount})</button>`;
  } else if (id === 'input-genero') {
    more = '<button type="button" class="chip chip--more" data-chips-expand aria-expanded="true">Ver menos</button>';
  }
  // "Escolher/Editar minhas plataformas" não é um filtro: leva ao perfil (app/filters.js cuida)
  const choose = options.find(o => o.value === CHOOSE);
  const chooseHtml = choose
    ? `<button type="button" class="chip chip--more" data-value="${CHOOSE}">${/^Editar/.test(choose.textContent) ? 'Editar minhas' : 'Escolher minhas'}</button>`
    : '';
  const current = select.value;
  group.innerHTML = shown.map(o => chipHtml(id, o, o.value === current)).join('');
  updateSummary();
  // As ações ficam fora do radiogroup: as setas andam só entre as opções
  const extras = group.nextElementSibling?.classList.contains('chip-extras') ? group.nextElementSibling : null;
  const extraHtml = more + chooseHtml;
  if (extraHtml) {
    const box = extras || Object.assign(document.createElement('div'), { className: 'chip-extras' });
    box.innerHTML = extraHtml;
    if (!extras) group.after(box);
  } else {
    extras?.remove();
  }
}

function setValue(select, value) {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function enhance(group) {
  const select = document.getElementById(group.dataset.chipsFor);
  if (!select) return;
  const draw = () => render(select, group);
  renderers.set(select.id, draw);

  // As opções mudam sozinhas ("Minhas plataformas" aparece e some)
  new MutationObserver(draw).observe(select, { childList: true, subtree: true, characterData: true });

  const field = group.closest('.chip-field');
  field.addEventListener('click', e => {
    if (e.target.closest('[data-chips-expand]')) {
      const open = group.dataset.expanded !== 'true';
      group.dataset.expanded = String(open);
      draw();
      field.querySelector('[data-chips-expand]')?.focus();
      return;
    }
    const chip = e.target.closest('.chip[data-value]');
    if (!chip) return;
    const value = chip.dataset.value;
    // Tocar de novo na pílula escolhida volta para "qualquer"
    const next = value !== '' && value !== CHOOSE && value === select.value ? '' : value;
    setValue(select, next);
    if (value !== CHOOSE) field.querySelector(`.chip[data-value="${CSS.escape(next)}"]`)?.focus();
  });
  draw();
}

// Logos dos serviços em destaque; sem eles, ficam os nomes
async function loadProviderLogos() {
  (await featuredProviderLogos()).forEach((logo, id) => providerLogos.set(id, logo));
  renderers.get('input-provider')?.();
}

// "Mais filtros": quantos estão ativos aparece no resumo, mesmo fechado
export function refreshMoreFilters({ openIfActive = false } = {}) {
  const details = document.getElementById('more-filters');
  if (!details) return;
  const { personId, similar, yearFrom, yearTo } = state.filters;
  const count = [
    personId,
    similar,
    countryLabel(),
    yearFrom || yearTo,
  ].filter(Boolean).length;
  const badge = document.getElementById('more-filters-count');
  badge.hidden = count === 0;
  badge.textContent = count === 1 ? '1 ativo' : `${count} ativos`;
  if (openIfActive && count > 0) {
    details.open = true;
    setFiltersOpen(true, { remember: false });
  }
  updateSummary();
}

// Resumo do que está valendo, à vista mesmo com os filtros recolhidos
function activeLabels() {
  const labels = [];
  ['mood', 'genre', 'provider', 'duration', 'rating'].forEach(key => {
    const option = filterField(key)?.selectedOptions[0];
    if (option && option.value) labels.push(labelOf(FILTER_FIELDS[key], option));
  });
  const { personName, similar, yearFrom: from, yearTo: to } = state.filters;
  if (personName) labels.push(personName);
  if (similar) labels.push(`Parecido com ${similar}`);
  labels.push(countryLabel());
  if (from || to) labels.push(`${from || '…'}–${to || '…'}`);
  return labels.filter(Boolean);
}

// Dorama já é coreano: o país fica desligado e não conta
function countryLabel() {
  const country = filterField('country');
  return country && !country.disabled && country.value ? country.selectedOptions[0].textContent.trim() : '';
}

function updateSummary() {
  const summary = document.getElementById('filters-summary');
  if (!summary) return;
  const labels = activeLabels();
  summary.textContent = labels.length ? joinMeta(labels) : 'Nenhum filtro: vale tudo';
  summary.classList.toggle('is-active', labels.length > 0);
  document.getElementById('filters-clear').hidden = labels.length === 0;
}

function setFiltersOpen(open, { remember = true } = {}) {
  const toggle = document.getElementById('filters-toggle');
  const body = document.getElementById('filters-body');
  if (!toggle || !body) return;
  toggle.setAttribute('aria-expanded', String(open));
  // Fechado: altura zero (a sanfona anima no CSS) e inerte, sem foco nem toque lá dentro
  body.classList.toggle('is-closed', !open);
  body.inert = !open;
  if (remember) storage.set(OPEN_KEY, open);
}

export function initChipFilters() {
  document.querySelectorAll('.chip-group[data-chips-for]').forEach(enhance);

  on('filters:changed', () => {
    renderers.forEach(draw => draw());
    refreshMoreFilters();
  });
  on('type:changed', () => refreshMoreFilters());
  // Recolhido por padrão: o resumo diz o que está valendo; abrir fica lembrado
  setFiltersOpen(storage.get(OPEN_KEY, false) === true, { remember: false });
  document.getElementById('filters-toggle')?.addEventListener('click', () => {
    // Só o toque da pessoa anima; o estado lembrado, ao abrir o app, entra parado
    document.getElementById('filters-body').classList.add('is-animated');
    setFiltersOpen(document.getElementById('filters-toggle').getAttribute('aria-expanded') !== 'true');
  });
  loadProviderLogos();
}
