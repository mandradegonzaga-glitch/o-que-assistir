// Cliente único do TMDB: monta a URL, faz cache, cancela pedidos obsoletos e padroniza erros.
import { API_KEY, BASE_URL, CACHE_TTL_MS } from '../config/constants.js';
import { MemoryCache } from '../utils/cache.js';

const responses = new MemoryCache(CACHE_TTL_MS);
const controllers = new Map();

export class TmdbError extends Error {
  constructor(status, path) {
    super(`TMDB respondeu ${status} em ${path}`);
    this.name = 'TmdbError';
    this.status = status;
  }
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}

// `language: null` omite o idioma (ex.: external_ids, trailers em inglês têm o próprio valor)
export function buildTmdbUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_key', API_KEY);
  const { language = 'pt-BR', ...rest } = params;
  if (language) url.searchParams.set('language', language);
  Object.entries(rest).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, value);
  });
  return url.toString();
}

export async function tmdbFetch(url, { ttl = CACHE_TTL_MS, signal } = {}) {
  const cached = responses.get(url);
  if (cached) return cached;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new TmdbError(res.status, new URL(url).pathname);

  const data = await res.json();
  responses.set(url, data, ttl);
  return data;
}

export function tmdbGet(path, params, options) {
  return tmdbFetch(buildTmdbUrl(path, params), options);
}

// Só o pedido mais recente de cada canal importa (ex.: digitar na busca, trocar de título no modal)
export function latestSignal(channel) {
  controllers.get(channel)?.abort();
  const controller = new AbortController();
  controllers.set(channel, controller);
  return controller.signal;
}

export function clearTmdbCache() {
  responses.clear();
}
