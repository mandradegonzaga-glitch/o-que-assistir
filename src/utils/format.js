// Datas, números e plurais sempre no formato do Brasil
const LOCALE = 'pt-BR';
const ratingFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const countFormat = new Intl.NumberFormat(LOCALE);
const pluralRules = new Intl.PluralRules(LOCALE);
const dayFormat = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });

export function formatRating(value) {
  return value ? ratingFormat.format(value) : 'N/A';
}

export function formatCount(value) {
  return countFormat.format(value || 0);
}

export function pluralize(count, one, other) {
  return pluralRules.select(count) === 'one' ? one : other;
}

// Informações em linha: "2020 · ★ 8,5". O espaço depois do "·" não quebra, então, se a linha
// precisar quebrar, o "·" desce junto com o que vem depois e nunca fica sozinho no fim
const NO_BREAK_SPACE = String.fromCharCode(0xa0);
const META_SEPARATOR = ` ·${NO_BREAK_SPACE}`;
export function joinMeta(parts) {
  return parts.filter(Boolean).join(META_SEPARATOR);
}

// "2008-01-20" (data do TMDB, sem horário) → "20/01/2008"; vazio ou fora do formato → ''
export function formatDay(day) {
  const [, y, m, d] = /^(\d{4})-(\d{2})-(\d{2})/.exec(day || '') || [];
  return y ? dayFormat.format(new Date(Number(y), Number(m) - 1, Number(d))) : '';
}
