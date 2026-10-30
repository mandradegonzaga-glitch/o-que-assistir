// Datas, números e plurais sempre no formato do Brasil
const LOCALE = 'pt-BR';
const ratingFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const countFormat = new Intl.NumberFormat(LOCALE);
const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'long', timeZone: 'UTC' });
const pluralRules = new Intl.PluralRules(LOCALE);

export function formatRating(value) {
  return value ? ratingFormat.format(value) : 'N/A';
}

export function formatCount(value) {
  return countFormat.format(value || 0);
}

// Datas do TMDB vêm como "AAAA-MM-DD", sem fuso: formatar em UTC evita voltar um dia
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

export function pluralize(count, one, other) {
  return pluralRules.select(count) === 'one' ? one : other;
}
