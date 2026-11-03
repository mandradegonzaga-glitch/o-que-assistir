// Regras puras do ingresso e do compartilhar: tipo do título, cor, texto da mensagem e o que vai para o banco.
import { formatRating } from '../utils/format.js';

export const KINDS = ['movie', 'tv', 'dorama'];
export const KIND_LABEL = { movie: 'Filme', tv: 'Série', dorama: 'Dorama' };
// Mesmas cores dos temas do app (--accent-primary em style.css)
export const TICKET_COLORS = { movie: '#ffc94d', tv: '#3dd6c6', dorama: '#ff8fb8' };

// O TMDB não tem "dorama": é uma série coreana. Os detalhes trazem origin_country;
// os cards da busca às vezes não, e aí vale o modo em que a pessoa está.
export function titleKind(item, appType) {
  const type = item?.media_type || appType;
  if (type === 'movie' || type === 'dorama') return type;
  if (Array.isArray(item?.origin_country)) return item.origin_country.includes('KR') ? 'dorama' : 'tv';
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
  const title = item.title || item.name || '';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];
  const meta = [KIND_LABEL[kind], year, item.vote_average ? `Nota ${formatRating(item.vote_average)}` : ''].filter(Boolean).join(' · ');
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

const POSTER_PATTERN = /^\/[A-Za-z0-9_-]{1,100}\.(jpg|jpeg|png|webp)$/;

// Linha de title_shares: só o necessário para o amigo ver o card e abrir o título.
// As mesmas regras estão no CHECK da tabela (database/title_shares.sql).
export function shareRow(item, kind) {
  const id = Number(item?.id);
  const title = (item?.title || item?.name || '').trim().slice(0, 300);
  if (!KINDS.includes(kind) || !Number.isInteger(id) || id <= 0 || !title) return null;
  return {
    media_type: kind,
    tmdb_id: id,
    title,
    poster_path: POSTER_PATTERN.test(item.poster_path || '') ? item.poster_path : null,
  };
}
