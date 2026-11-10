// Vídeos do TMDB (/videos) em ordem de preferência para o trailer da página do título.
// O TMDB não sabe quando o YouTube tira um vídeo do ar, por isso a página recebe a lista
// inteira e fica com o primeiro que ainda existe (src/api/youtube.js).
const KIND_ORDER = ['Trailer', 'Teaser'];

const kindRank = video => {
  const i = KIND_ORDER.indexOf(video.type);
  return i === -1 ? KIND_ORDER.length : i;
};

export function rankTrailers(videos = []) {
  return videos
    .filter(v => v.site === 'YouTube' && v.key)
    .sort((a, b) =>
      kindRank(a) - kindRank(b) ||
      Number(Boolean(b.official)) - Number(Boolean(a.official)) ||
      String(b.published_at ?? '').localeCompare(String(a.published_at ?? '')))
    .map(v => v.key);
}
