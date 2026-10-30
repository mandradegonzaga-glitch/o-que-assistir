// Datas, números e plurais sempre no formato do Brasil
const LOCALE = 'pt-BR';
const ratingFormat = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const countFormat = new Intl.NumberFormat(LOCALE);
const pluralRules = new Intl.PluralRules(LOCALE);

export function formatRating(value) {
  return value ? ratingFormat.format(value) : 'N/A';
}

export function formatCount(value) {
  return countFormat.format(value || 0);
}

export function pluralize(count, one, other) {
  return pluralRules.select(count) === 'one' ? one : other;
}
