// Sessão às escuras: o que dá para mostrar sem entregar o título.
import { genreIds, genreNames } from './genres.js';

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A sinopse às vezes cita o próprio título: troca por "[título]"
export function maskTitle(overview, names) {
  let text = String(overview || '');
  // "Avatar Aang: O Último Mestre do Ar" → também "Avatar Aang" (a sinopse costuma citar só essa parte)
  const full = (names || []).filter(n => typeof n === 'string').flatMap(n => [n, n.split(/\s*[:–—]\s|\s-\s/)[0]]);
  const list = [...new Set(full.map(n => n.trim()).filter(n => n.length >= 3))]
    .sort((a, b) => b.length - a.length); // o mais longo antes ("Duna: Parte Dois" antes de "Duna")
  for (const name of list) {
    text = text.replace(new RegExp(escapeRegExp(name), 'gi'), '[título]');
  }
  return text;
}

// Sinopse curta demais não dá para escolher no escuro
export const hasBlindOverview = item => String(item?.overview || '').trim().length >= 60;

export function lengthText(details, type) {
  if (type === 'movie') {
    const min = Number(details?.runtime);
    if (!min) return '';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  }
  const seasons = Number(details?.number_of_seasons);
  if (!seasons) return '';
  return `${seasons} ${seasons === 1 ? 'temporada' : 'temporadas'}`;
}

export function decadeText(details) {
  const year = parseInt(String(details?.release_date || details?.first_air_date || ''), 10);
  if (!Number.isInteger(year) || year < 1880) return '';
  const decade = Math.floor(year / 10) * 10;
  return decade >= 2000 ? `Anos ${decade}` : `Anos ${String(decade).slice(2)}`;
}

export function blindFacts(details, type) {
  return {
    rating: Number(details?.vote_average) || 0,
    length: lengthText(details, type),
    decade: decadeText(details),
    genres: genreNames(genreIds(details?.genres ?? details?.genre_ids), 2),
    overview: maskTitle(details?.overview, [details?.title, details?.name, details?.original_title, details?.original_name]),
  };
}
