// Filtro por país de origem (with_origin_country do TMDB). Coreia do Sul fica de fora em "Dorama",
// que já é só coreano.
const COUNTRIES = [
  { code: 'BR', name: 'Brasil' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'FR', name: 'França' },
  { code: 'ES', name: 'Espanha' },
  { code: 'IT', name: 'Itália' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'JP', name: 'Japão' },
  { code: 'KR', name: 'Coreia do Sul' },
  { code: 'IN', name: 'Índia' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'TR', name: 'Turquia' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'SE', name: 'Suécia' },
];

export const isCountry = code => COUNTRIES.some(c => c.code === code);
