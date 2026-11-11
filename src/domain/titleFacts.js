// Informações do título: ★ nota • ano • duração ou temporadas; depois a classificação e até 2 gêneros
import { genreIds, genreNames } from './genres.js';
import { formatRating, pluralize } from '../utils/format.js';

// 136 → "2h 16min"; 45 → "45min"; 120 → "2h"
export function formatRuntime(minutes) {
  const total = Math.round(Number(minutes));
  if (!Number.isFinite(total) || total <= 0) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

export function seasonsLabel(count) {
  const n = Number(count);
  if (!Number.isInteger(n) || n <= 0) return '';
  return `${n} ${pluralize(n, 'temporada', 'temporadas')}`;
}

// genres: ids (genre_ids do /discover) ou objetos { id } dos detalhes; o nome sai sempre em português
// certification: classificação indicativa do Brasil ("L", "14"…), só para filme
export function titleFacts({ rating, date, runtime, seasons, genres, certification } = {}) {
  const ids = genreIds(genres);
  const facts = [];
  if (rating) facts.push({ kind: 'rating', text: formatRating(rating) });
  const year = String(date || '').slice(0, 4);
  if (/^\d{4}$/.test(year)) facts.push({ kind: 'year', text: year });
  const length = seasons ? seasonsLabel(seasons) : formatRuntime(runtime);
  if (length) facts.push({ kind: 'length', text: length });
  if (certification) facts.push(certification === 'L'
    ? { kind: 'certification', text: 'Livre', label: 'Classificação: livre' }
    : { kind: 'certification', text: certification, label: `Classificação: ${certification} anos` });
  const names = genreNames(ids, 2);
  if (names.length) facts.push({ kind: 'genres', items: names });
  return facts;
}

// Tamanho do título na página do título. A letra é grande e em maiúsculas: uma palavra comprida
// ("Remasterizada") não cabe na largura do celular e o navegador a partia no meio.
// Título longo ou com palavra longa ganha letra menor.
export function titleSize(text = '') {
  const clean = String(text).trim();
  const longestWord = Math.max(0, ...clean.split(/\s+/).map(word => [...word].length));
  if (clean.length > 60 || longestWord > 11) return 'long';
  if (clean.length > 32 || longestWord > 9) return 'mid';
  return '';
}
