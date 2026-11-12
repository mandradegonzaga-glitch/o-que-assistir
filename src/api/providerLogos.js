// Logos dos serviços em destaque (lista do TMDB, guardada por um dia): filtros e primeira visita.
// Sem resposta do TMDB, volta vazio e as telas ficam com os nomes.
import { tmdbGet } from './tmdb.js';
import { FEATURED_PROVIDERS } from '../domain/providers.js';
import { DAY_MS } from '../utils/date.js';

export async function featuredProviderLogos() {
  const logos = new Map(); // id → caminho do logo no TMDB
  try {
    const data = await tmdbGet('/watch/providers/movie', { language: 'pt-BR', watch_region: 'BR' }, { ttl: DAY_MS });
    const wanted = new Set(FEATURED_PROVIDERS.map(p => p.id));
    (data?.results || []).forEach(p => {
      const id = String(p.provider_id);
      if (wanted.has(id) && p.logo_path) logos.set(id, p.logo_path);
    });
  } catch {
    // os nomes continuam funcionando
  }
  return logos;
}
