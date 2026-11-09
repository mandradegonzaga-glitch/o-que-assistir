// "Nos cinemas" / "Estreia nos cinemas em DD/MM" para filmes sem streaming, pelas datas de lançamento
// do Brasil no TMDB (release_dates). Tipos do TMDB: 2 = cinema limitado, 3 = cinema, 4 = digital, 5 = físico, 6 = TV.
import { daysBetween, localDay } from '../utils/date.js';
const THEATRICAL = [3, 2];
const HOME = [4, 5, 6];
// Depois disso sem streaming, o filme provavelmente já saiu de cartaz
export const IN_THEATERS_DAYS = 75;

// "2026-11-20T00:00:00.000Z" → "2026-11-20" (a data do TMDB é o dia no país, sem fuso que importe)
function day(value) {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

// "2026-11-20" → "20/11" no ano corrente, "20/11/2027" em outro ano
export function formatPremiere(date, today) {
  const [y, m, d] = date.split('-');
  return y === today.slice(0, 4) ? `${d}/${m}` : `${d}/${m}/${y}`;
}

// releaseDates: o objeto `release_dates` do TMDB ({ results: [{ iso_3166_1, release_dates: [{ type, release_date }] }] })
// Retorna null (nada a dizer), { kind: 'now' } ou { kind: 'soon', date: 'AAAA-MM-DD' }
export function cinemaStatus(releaseDates, today = localDay()) {
  const br = (releaseDates?.results || []).find(r => r.iso_3166_1 === 'BR');
  const entries = (br?.release_dates || []).map(r => ({ type: r.type, date: day(r.release_date) })).filter(r => r.date);
  const theatrical = THEATRICAL
    .map(type => entries.filter(r => r.type === type).map(r => r.date).sort()[0])
    .find(Boolean);
  if (!theatrical) return null;

  if (theatrical > today) return { kind: 'soon', date: theatrical };

  const alreadyAtHome = entries.some(r => HOME.includes(r.type) && r.date <= today);
  if (alreadyAtHome || daysBetween(theatrical, today) > IN_THEATERS_DAYS) return null;
  return { kind: 'now' };
}

export function cinemaLabel(status, today = localDay()) {
  if (!status) return '';
  return status.kind === 'now' ? 'Nos cinemas' : `Estreia nos cinemas em ${formatPremiere(status.date, today)}`;
}
