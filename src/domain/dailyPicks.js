// Indicações do dia: um filme, uma série e um dorama, iguais para todo mundo no mesmo dia.
// Lógica pura: quem busca no TMDB e desenha é src/app/dailyPicks.js.

const PAGE_SIZE = 20; // resultados por página do /discover

// Só títulos bem avaliados e conhecidos; ordenados por número de votos, que muda pouco de um dia para o outro
export const PICK_KINDS = [
  {
    kind: 'movie', label: 'Filme', endpoint: 'movie', pages: 10,
    params: { 'vote_average.gte': 7.3, 'vote_count.gte': 3000 },
  },
  {
    kind: 'tv', label: 'Série', endpoint: 'tv', pages: 10,
    // Sem animação, reality e talk show. As coreanas ficam para o cartão Dorama (ver choosePick)
    params: { 'vote_average.gte': 7.8, 'vote_count.gte': 800, without_genres: '16|10764|10767' },
  },
  {
    kind: 'dorama', label: 'Dorama', endpoint: 'tv', pages: 6,
    params: { 'vote_average.gte': 7.8, 'vote_count.gte': 100, with_origin_country: 'KR', without_genres: '16' },
  },
];

const dayNumber = day => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

// Passo 37 é primo com 120 e 200: o rodízio passa por todo o grupo antes de repetir,
// e dias seguidos caem em páginas diferentes. Cada tipo começa num ponto diferente.
export function pickSlot(kindIndex, day) {
  const kind = PICK_KINDS[kindIndex];
  const size = kind.pages * PAGE_SIZE;
  const position = (((dayNumber(day) + kindIndex * 11) * 37) % size + size) % size;
  return { page: Math.floor(position / PAGE_SIZE) + 1, index: position % PAGE_SIZE };
}

export function pickRequest(kindIndex, day) {
  const kind = PICK_KINDS[kindIndex];
  const { page, index } = pickSlot(kindIndex, day);
  return {
    path: `/discover/${kind.endpoint}`,
    params: { sort_by: 'vote_count.desc', include_adult: 'false', page, ...kind.params },
    index,
  };
}

const isKorean = item => Array.isArray(item?.origin_country) && item.origin_country.includes('KR');

// A página pode vir menor que o previsto, com título sem pôster ou (em Série) com uma coreana:
// anda até achar um que sirva
export function choosePick(results, index, kind) {
  const list = Array.isArray(results) ? results : [];
  for (let step = 0; step < list.length; step++) {
    const item = list[(index + step) % list.length];
    if (item?.poster_path && !(kind === 'tv' && isKorean(item))) return item;
  }
  return null;
}

// Hora local até a próxima meia-noite, para trocar as indicações sem recarregar
export function msUntilMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next - now;
}
