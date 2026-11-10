// Streamings que a pessoa assina. Os ids vêm do TMDB; a lista completa é buscada lá (src/app/myProviders.js).
export const FEATURED_PROVIDERS = [
  { id: '8', name: 'Netflix' },
  { id: '119', name: 'Prime Video' },
  { id: '350', name: 'Apple TV' },
  { id: '337', name: 'Disney+' },
  { id: '531', name: 'Paramount+' },
  { id: '1899', name: 'HBO Max' },
  { id: '307', name: 'Globoplay' },
  { id: '167', name: 'Claro video' },
  { id: '47', name: 'Looke' },
  { id: '11', name: 'MUBI' },
  { id: '283', name: 'Crunchyroll' },
];

// Fora da escolha: lojas de aluguel/compra (nada ali está incluído em assinatura)
// e variações que repetem o mesmo serviço
const NOT_A_SUBSCRIPTION = /channel|with ads|store|amazon video|premium/i;

// "Netflix Standard with Ads", "Amazon Prime Video with Ads": o mesmo serviço, no plano com anúncios
const AD_PLAN = /\s+(standard\s+)?with ads$/i;

// "Onde assistir" de um título: o plano com anúncios só aparece quando o serviço não está lá sem ele
export function watchProviders(flatrate = []) {
  const plain = flatrate.filter(p => !AD_PLAN.test(p.provider_name)).map(p => p.provider_name.toLowerCase());
  return flatrate.filter(p => {
    if (!AD_PLAN.test(p.provider_name)) return true;
    const base = p.provider_name.replace(AD_PLAN, '').toLowerCase();
    return !plain.some(name => name.startsWith(base));
  });
}

const featuredIds = new Set(FEATURED_PROVIDERS.map(p => p.id));

// Une as listas de filmes e séries do TMDB, sem os destaques, em ordem alfabética
export function buildOtherProviders(...lists) {
  const byId = new Map();
  lists.flat().forEach(provider => {
    const id = String(provider?.provider_id ?? '');
    const name = provider?.provider_name;
    if (!/^\d+$/.test(id) || !name || featuredIds.has(id) || NOT_A_SUBSCRIPTION.test(name)) return;
    byId.set(id, { id, name });
  });
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

const normalize = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function matchesProviderSearch(name, query) {
  return normalize(name).includes(normalize(query));
}
