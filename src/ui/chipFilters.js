// Filtros em pílulas (Clima, Gênero, Onde assistir, Duração) e o "Mais filtros".
// Os <select> escondidos continuam guardando o valor: a busca, o link (urlSync) e as regras
// que já existiam (gênero e clima se excluem, "Escolher minhas plataformas") seguem iguais.
// As pílulas só mostram e trocam esse valor; qualquer mudança no select (pelo código ou pela
// pessoa) redesenha as pílulas.
import { tmdbGet } from '../api/tmdb.js';
import { IMG_URL } from '../config/constants.js';
import { FEATURED_PROVIDERS } from '../domain/providers.js';
import { state } from '../state/appState.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { storage } from '../utils/storage.js';

const MY_PROVIDERS = 'minhas';
const CHOOSE = 'escolher';
const DAY_MS = 86_400_000;
const OPEN_KEY = 'filters_open'; // aberto ou recolhido, lembrado neste aparelho

// Nomes curtos para caber na pílula; o resto usa o texto da própria opção
const LABELS = {
  'input-mood': { '': 'Qualquer', leve: 'Leve e divertido', chorar: 'Para chorar', imaginacao: 'Imaginação' },
  'input-genero': { '': 'Todos' },
  'input-provider': { '': 'Todas', [MY_PROVIDERS]: 'Minhas plataformas' },
  'duration-select': { '': 'Qualquer', short: 'Até 1h30', medium: '1h30 a 2h', long: 'Mais de 2h' },
};

// Gêneros à vista antes do "Ver todos"; o escolhido aparece sempre
const MAIN_GENRES = ['28', '35', '27', '10749', '18', '53', '878', '16', 'natal'];

const providerLogos = new Map(); // id → caminho do logo no TMDB
const valueDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
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
  // "Escolher/Editar minhas plataformas" não é um filtro: leva ao perfil (onProviderChange cuida)
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

  // Valor trocado pelo código (link, "gênero limpa clima", "Surpreenda-me"...): as pílulas acompanham
  Object.defineProperty(select, 'value', {
    configurable: true,
    get() { return valueDescriptor.get.call(this); },
    set(v) { valueDescriptor.set.call(this, v); draw(); },
  });
  select.addEventListener('change', draw);
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

// Logos dos serviços em destaque (lista do TMDB, guardada por um dia). Sem ela, ficam os nomes.
async function loadProviderLogos() {
  try {
    const data = await tmdbGet('/watch/providers/movie', { language: 'pt-BR', watch_region: 'BR' }, { ttl: DAY_MS });
    const wanted = new Set(FEATURED_PROVIDERS.map(p => p.id));
    (data?.results || []).forEach(p => {
      const id = String(p.provider_id);
      if (wanted.has(id) && p.logo_path) providerLogos.set(id, p.logo_path);
    });
    renderers.get('input-provider')?.();
  } catch {
    // os nomes continuam funcionando
  }
}

// "Mais filtros": quantos estão ativos aparece no resumo, mesmo fechado
export function refreshMoreFilters({ openIfActive = false } = {}) {
  const details = document.getElementById('more-filters');
  if (!details) return;
  const value = id => document.getElementById(id)?.value.trim();
  const country = document.getElementById('input-country');
  const count = [
    state.personId,
    value('input-similar'),
    country && !country.disabled && country.value,
    value('year-from') || value('year-to'),
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
  ['input-mood', 'input-genero', 'input-provider', 'duration-select'].forEach(id => {
    const select = document.getElementById(id);
    const option = select?.selectedOptions[0];
    if (option && option.value) labels.push(labelOf(id, option));
  });
  if (state.personId) labels.push(document.getElementById('person-name')?.textContent.trim());
  const similar = document.getElementById('input-similar')?.value.trim();
  if (similar) labels.push(`Parecido com ${similar}`);
  const country = document.getElementById('input-country');
  if (country && !country.disabled && country.value) labels.push(country.selectedOptions[0].textContent.trim());
  const from = document.getElementById('year-from')?.value.trim();
  const to = document.getElementById('year-to')?.value.trim();
  if (from || to) labels.push(`${from || '…'}–${to || '…'}`);
  return labels.filter(Boolean);
}

function updateSummary() {
  const summary = document.getElementById('filters-summary');
  if (!summary) return;
  const labels = activeLabels();
  summary.textContent = labels.length ? labels.join(' · ') : 'Nenhum filtro: vale tudo';
  summary.classList.toggle('is-active', labels.length > 0);
}

function setFiltersOpen(open, { remember = true } = {}) {
  const toggle = document.getElementById('filters-toggle');
  const body = document.getElementById('filters-body');
  if (!toggle || !body) return;
  toggle.setAttribute('aria-expanded', String(open));
  body.hidden = !open;
  if (remember) storage.set(OPEN_KEY, open);
}

export function initChipFilters() {
  document.querySelectorAll('.chip-group[data-chips-for]').forEach(enhance);

  const details = document.getElementById('more-filters');
  if (details) {
    const later = () => setTimeout(refreshMoreFilters, 0); // depois das ações da própria página
    details.addEventListener('input', later);
    details.addEventListener('change', later);
    details.addEventListener('click', later);
    const country = document.getElementById('input-country');
    if (country) {
      Object.defineProperty(country, 'value', {
        configurable: true,
        get() { return valueDescriptor.get.call(this); },
        set(v) { valueDescriptor.set.call(this, v); later(); },
      });
    }
  }
  // Recolhido por padrão: o resumo diz o que está valendo; abrir fica lembrado
  setFiltersOpen(storage.get(OPEN_KEY, false) === true, { remember: false });
  document.getElementById('filters-toggle')?.addEventListener('click', () => {
    setFiltersOpen(document.getElementById('filters-body').hidden);
  });
  document.getElementById('filters-body')?.addEventListener('input', () => setTimeout(updateSummary, 0));
  loadProviderLogos();
}
