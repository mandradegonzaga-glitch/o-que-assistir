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
