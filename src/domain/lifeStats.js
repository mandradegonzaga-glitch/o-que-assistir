// Estatísticas de vida (parte 2 do DNA): horas assistidas e ator mais visto.
// Usa um resumo pequeno dos detalhes do TMDB de cada título (ver titleFacts) e o histórico.
import { DAY_MS } from '../utils/date.js';

// Sem média de episódio no TMDB, usamos a duração do último episódio, que às vezes é um final
// longo (Stranger Things: 129 min, e a média real fica perto de 70). O teto de 70 min cobre
// os doramas (60 a 70 min por episódio) sem inflar as séries com final longo.
export const MAX_EPISODE_MINUTES = 70;
const CAST_PER_TITLE = 5;
// Ator só aparece como "mais visto" se estiver em pelo menos este número de títulos
export const MIN_ACTOR_TITLES = 2;
// Séries mudam (episódios novos); filmes, não
export const TV_FACTS_TTL_MS = 30 * DAY_MS;

export const factsKey = (type, id) => `${type === 'movie' || !type ? 'movie' : 'tv'}:${id}`;

const positive = n => (Number.isFinite(n) && n > 0 ? n : null);

// Resumo dos detalhes do TMDB (com append_to_response=credits): só o que as contas usam
export function titleFacts(details, type, now = Date.now()) {
  const cast = (details?.credits?.cast || [])
    .filter(c => c && c.id && c.name)
    .slice(0, CAST_PER_TITLE)
    .map(c => [c.id, c.name]);
  if (type === 'movie' || !type) {
    return { runtime: positive(details?.runtime), cast, at: now };
  }
  const runTimes = (details?.episode_run_time || []).filter(n => positive(n));
  const average = runTimes.length ? runTimes.reduce((a, b) => a + b, 0) / runTimes.length : null;
  const episodeRuntime = average || positive(details?.last_episode_to_air?.runtime);
  return {
    episodeRuntime: episodeRuntime ? Math.min(Math.round(episodeRuntime), MAX_EPISODE_MINUTES) : null,
    episodes: positive(details?.number_of_episodes),
    cast,
    at: now,
  };
}

export function isFresh(facts, type, now = Date.now()) {
  if (!facts) return false;
  if (type === 'movie' || !type) return true;
  return now - (facts.at || 0) < TV_FACTS_TTL_MS;
}

// Minutos de um título. Série: os episódios marcados, se houver; senão, a série inteira
// (quem marca uma série como vista sem marcar episódios viu tudo).
export function titleMinutes(entry, facts, watchedEpisodes = 0) {
  if (!facts) return null;
  if (entry.type === 'movie' || !entry.type) return facts.runtime || null;
  if (!facts.episodeRuntime) return null;
  const episodes = watchedEpisodes > 0 ? watchedEpisodes : facts.episodes;
  return episodes ? episodes * facts.episodeRuntime : null;
}

// history: títulos vistos. inProgress: séries com episódios marcados [{ id, type, episodes }],
// inclusive as que ainda não estão no histórico. facts: { 'movie:1': {...}, 'tv:2': {...} }
export function computeLifeStats(history, facts, inProgress = []) {
  const watchedEpisodes = new Map(inProgress.map(s => [factsKey(s.type, s.id), s.episodes || 0]));
  const seen = new Set();
  const actors = new Map();
  let minutes = 0;
  let counted = 0;
  let missing = 0;

  const add = (entry, episodes) => {
    const key = factsKey(entry.type, entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    const f = facts[key];
    const m = titleMinutes(entry, f, episodes);
    if (m) { minutes += m; counted++; } else missing++;
    (f?.cast || []).forEach(([id, name]) => {
      const a = actors.get(id) || { id, name, count: 0 };
      a.count++;
      actors.set(id, a);
    });
  };

  (history || []).forEach(entry => add(entry, watchedEpisodes.get(factsKey(entry.type, entry.id)) || 0));
  // Séries em andamento contam só os episódios marcados, e não entram no ator mais visto
  // (ainda não foram "vistas"): só as horas.
  inProgress.forEach(s => {
    const key = factsKey(s.type, s.id);
    if (seen.has(key) || !(s.episodes > 0)) return;
    seen.add(key);
    const m = titleMinutes({ type: s.type }, facts[key], s.episodes || 0);
    if (m) { minutes += m; counted++; } else missing++;
  });

  const topActor = [...actors.values()]
    .filter(a => a.count >= MIN_ACTOR_TITLES)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))[0] || null;

  return { minutes, counted, missing, topActor };
}

// "342 h", "1.250 h", "45 min"
export function formatWatchTime(minutes) {
  if (!minutes || minutes < 60) return `${Math.round(minutes || 0)} min`;
  return `${new Intl.NumberFormat('pt-BR').format(Math.round(minutes / 60))} h`;
}

// Quais títulos ainda precisam de detalhes do TMDB
export function missingFacts(titles, facts, now = Date.now()) {
  const keys = new Set();
  return (titles || []).filter(t => {
    const key = factsKey(t.type, t.id);
    if (keys.has(key)) return false;
    keys.add(key);
    return !isFresh(facts[key], t.type, now);
  });
}
