// DNA do usuário no perfil: desenha o que src/domain/tasteDna.js calcula
import { computeTasteDna, decadeLabel, otherNamesText } from '../domain/tasteDna.js';
import { hideLifeStats, renderLifeStats } from './lifeStats.js';
import { renderTasteCard } from './tasteCard.js';
import { session } from '../state/appState.js';
import { formatCount, pluralize } from '../utils/format.js';

const titleWord = n => pluralize(n, 'título', 'títulos');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function genreRow(genre) {
  const label = el('span', 'dna__genre-name', genre.name);
  const value = el('span', 'dna__genre-value', `${genre.percent}%`);
  // Outros: sem barra (ela ficava maior que a do 1º gênero e parecia o destaque); diz o que entrou nele
  if (genre.id === 'other') {
    const item = el('li', 'dna__genre dna__genre--other');
    item.append(label, value, el('span', 'dna__genre-members', otherNamesText(genre.members)));
    return item;
  }
  const item = el('li', 'dna__genre');
  const track = el('span', 'dna__genre-track');
  track.setAttribute('aria-hidden', 'true');
  const fill = el('span', 'dna__genre-fill');
  fill.style.width = `${genre.percent}%`;
  track.append(fill);
  item.append(label, value, track);
  return item;
}

function fact(term, value) {
  const box = el('div', 'dna__fact');
  box.append(el('dt', 'dna__fact-term', term), el('dd', 'dna__fact-value', value));
  return box;
}

function monthColumn(month, max) {
  const item = el('li', 'dna__month');
  // Intl.PluralRules('pt-BR') trata 0 como singular ("0 título"); zero vira "nenhum título"
  const full = `${month.label}: ${month.count === 0 ? 'nenhum título' : `${formatCount(month.count)} ${titleWord(month.count)}`}`;
  item.title = full;
  item.setAttribute('aria-label', full);
  const value = el('span', 'dna__month-value', formatCount(month.count));
  value.setAttribute('aria-hidden', 'true');
  const bar = el('span', 'dna__month-bar');
  bar.setAttribute('aria-hidden', 'true');
  const fill = el('span', 'dna__month-fill');
  // Mês sem nada vira um traço (pela classe), para a linha de base não sumir
  if (month.count > 0) fill.style.height = `${(month.count / max) * 100}%`;
  else fill.classList.add('is-empty');
  bar.append(fill);
  const label = el('span', 'dna__month-label', month.label);
  label.setAttribute('aria-hidden', 'true');
  item.append(value, bar, label);
  return item;
}

export function renderTasteDna(history = session.user.history, now = new Date()) {
  const section = document.getElementById('dna');
  if (!section) return;
  const dna = computeTasteDna(history, now);
  renderTasteCard(history);

  const summary = document.getElementById('dna-summary');
  const note = document.getElementById('dna-note');
  const genres = document.getElementById('dna-genres');
  const facts = document.getElementById('dna-facts');
  const monthsWrap = document.getElementById('dna-months-wrap');

  if (dna.total === 0) {
    summary.textContent = 'Marque títulos como assistidos para descobrir o seu DNA.';
    note.hidden = true;
    genres.replaceChildren();
    facts.replaceChildren();
    monthsWrap.hidden = true;
    section.classList.add('is-empty');
    hideLifeStats();
    return;
  }
  section.classList.remove('is-empty');

  summary.textContent = dna.sentence
    ? `Você é ${dna.sentence}.`
    : 'Os títulos que você marcou ainda não têm gêneros salvos.';
  note.hidden = !(dna.sentence && dna.forming);
  note.textContent = `Seu DNA ainda está se formando: ele usa ${formatCount(dna.genreTitles)} ${titleWord(dna.genreTitles)} até agora.`;
  genres.replaceChildren(...dna.genres.map(genreRow));

  const { movie, tv, dorama } = dna.types;
  facts.replaceChildren(
    fact('Filmes', formatCount(movie)),
    fact('Séries', formatCount(tv)),
    fact('Doramas', formatCount(dorama)),
    fact('Década favorita', dna.decade ? decadeLabel(dna.decade.decade) : '—'),
  );

  renderLifeStats(history);

  const max = Math.max(...dna.months.map(m => m.count));
  monthsWrap.hidden = false;
  document.getElementById('dna-months').replaceChildren(...dna.months.map(m => monthColumn(m, max)));
}
