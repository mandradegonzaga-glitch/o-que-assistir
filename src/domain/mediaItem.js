export function getTitle(item) {
  return item.title || item.name || '';
}

export function getYear(item) {
  const date = item.release_date || item.first_air_date || '';
  return date.split('-')[0] || '';
}

export function getTmdbEndpoint(appType) {
  return appType === 'dorama' ? 'tv' : appType;
}

export function filterValidItems(items, blacklist = []) {
  return items.filter(item => item.poster_path && !blacklist.includes(item.id));
}

export function pickRandom(items) {
  if (!items || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)];
}

export function normalizeMediaType(item, stateType) {
  return item.media_type || stateType;
}
