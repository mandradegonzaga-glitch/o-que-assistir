// Regras puras do ingresso e do compartilhar: tipo do título, cor, texto da mensagem e o que vai para o banco.
import { formatRating } from '../utils/format.js';
import { MEDIA_KIND, MEDIA_TYPES, getYear, getTitle, isKorean, isPosterPath } from './mediaItem.js';


// O TMDB não tem "dorama": é uma série coreana. Os detalhes trazem origin_country;
// os cards da busca às vezes não, e aí vale o modo em que a pessoa está.
export function titleKind(item, appType) {
  const type = item?.media_type || appType;
  if (type === 'movie' || type === 'dorama') return type;
  if (Array.isArray(item?.origin_country)) return isKorean(item) ? 'dorama' : 'tv';
  if (appType === 'dorama') return 'dorama';
  return type === 'tv' || appType === 'tv' ? 'tv' : 'movie';
}

// Corta no fim de uma palavra, sem deixar pontuação solta antes das reticências
export function truncate(text, max) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const end = cut.lastIndexOf(' ');
  return `${(end > max * 0.6 ? cut.slice(0, end) : clean.slice(0, max)).replace(/[\s,.:;!?-]+$/, '')}…`;
}

export function titleLink(base, kind, id) {
  return `${base}?titulo=${kind}-${id}`;
}

export function shareText({ item, kind, url, cast = [], providers = [] }) {
  const title = getTitle(item);
  const year = getYear(item);
  const meta = [MEDIA_KIND[kind].one, year, item.vote_average ? `Nota ${formatRating(item.vote_average)}` : ''].filter(Boolean).join(' · ');
  const lines = [`Hoje é dia de: ${title}`, meta];
  const synopsis = truncate(item.overview, 220);
  if (synopsis) lines.push('', synopsis);
  const extra = [];
  if (cast.length) extra.push(`Elenco: ${cast.slice(0, 4).join(', ')}`);
  if (providers.length) extra.push(`Onde assistir: ${providers.join(', ')}`);
  if (extra.length) lines.push('', ...extra);
  lines.push('', 'Veja no O Que Assistir?', url);
  return lines.join('\n');
}


// Linha de title_shares: só o necessário para o amigo ver o card e abrir o título.
// As mesmas regras estão no CHECK da tabela (database/title_shares.sql).
export function shareRow(item, kind) {
  const id = Number(item?.id);
  const title = (item?.title || item?.name || '').trim().slice(0, 300);
  if (!MEDIA_TYPES.includes(kind) || !Number.isInteger(id) || id <= 0 || !title) return null;
  return {
    media_type: kind,
    tmdb_id: id,
    title,
    poster_path: isPosterPath(item.poster_path) ? item.poster_path : null,
  };
}
