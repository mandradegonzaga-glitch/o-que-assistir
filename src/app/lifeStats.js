// Horas assistidas e ator mais visto no perfil (parte 2 do DNA).
// Os detalhes de cada título vêm do TMDB uma vez e ficam guardados no aparelho.
import { supabaseGetAllSeriesInProgress } from '../api/supabase.js';
import { tmdbGet } from '../api/tmdb.js';
import { MIN_ACTOR_TITLES, computeLifeStats, factsKey, formatWatchTime, missingFacts, titleFacts } from '../domain/lifeStats.js';
import { session } from '../state/appState.js';
import { formatCount, pluralize } from '../utils/format.js';
import { storage } from '../utils/storage.js';

export const FACTS_STORAGE_KEY = 'title_facts';
const CONCURRENCY = 4;
let renderToken = 0;
// Muda ao sair da conta: uma busca que ainda estava rodando não grava mais nada
let generation = 0;

const readFacts = () => {
  const facts = storage.get(FACTS_STORAGE_KEY, {});
  return facts && typeof facts === 'object' && !Array.isArray(facts) ? facts : {};
};

async function loadInProgress() {
  if (!session.currentUserId || session.currentUser === 'guest') return [];
  const result = await supabaseGetAllSeriesInProgress(session.currentUserId);
  return result.success ? result.series.map(s => ({ id: s.id, type: s.type, episodes: s.watchedKeys.size })) : [];
}

// Busca o que falta, CONCURRENCY por vez; devolve quantos falharam
async function fillFacts(titles, facts) {
  const queue = missingFacts(titles, facts);
  let failed = 0;
  const worker = async () => {
    while (queue.length) {
      const t = queue.shift();
      const media = t.type === 'movie' || !t.type ? 'movie' : 'tv';
      try {
        const details = await tmdbGet(`/${media}/${t.id}`, { append_to_response: 'credits' });
        facts[factsKey(t.type, t.id)] = titleFacts(details, t.type);
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return failed;
}

// Guarda só o que ainda é usado (títulos tirados do histórico saem)
function saveFacts(titles, facts) {
  const keep = new Set(titles.map(t => factsKey(t.type, t.id)));
  storage.set(FACTS_STORAGE_KEY, Object.fromEntries(Object.entries(facts).filter(([k]) => keep.has(k))));
}

export async function loadLifeStats(history) {
  const gen = generation;
  const inProgress = await loadInProgress();
  const titles = [...history, ...inProgress];
  const facts = readFacts();
  const failed = await fillFacts(titles, facts);
  if (gen === generation) saveFacts(titles, facts);
  return { ...computeLifeStats(history, facts, inProgress), failed };
}

function fact(term, value, note) {
  const box = document.createElement('div');
  box.className = 'dna__fact';
  const dt = document.createElement('dt');
  dt.className = 'dna__fact-term';
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.className = 'dna__fact-value';
  dd.textContent = value;
  box.append(dt, dd);
  if (note) {
    const small = document.createElement('dd');
    small.className = 'dna__fact-note';
    small.textContent = note;
    box.append(small);
  }
  return box;
}

export async function renderLifeStats(history = session.user.history) {
  const box = document.getElementById('dna-life');
  if (!box) return;
  const token = ++renderToken;
  box.hidden = false;
  box.setAttribute('aria-busy', 'true');
  box.replaceChildren(fact('Horas assistidas', '…', 'Calculando'), fact('Ator mais visto', '…', 'Calculando'));

  let stats;
  try {
    stats = await loadLifeStats(history);
  } catch {
    stats = { minutes: 0, counted: 0, missing: history.length, topActor: null, failed: history.length };
  }
  if (token !== renderToken) return; // outro desenho mais novo já começou

  const offline = stats.counted === 0 && stats.failed > 0;
  const hoursNote = offline
    ? 'Sem conexão com o TMDB'
    : `aprox., ${stats.missing > 0 ? `com ${formatCount(stats.counted)} de ${formatCount(stats.counted + stats.missing)} títulos` : 'pela duração no TMDB'}`;
  const actor = stats.topActor;
  box.replaceChildren(
    fact('Horas assistidas', offline ? '—' : formatWatchTime(stats.minutes), hoursNote),
    actor
      ? fact('Ator mais visto', actor.name, `em ${formatCount(actor.count)} ${pluralize(actor.count, 'título', 'títulos')}`)
      : fact('Ator mais visto', '—', offline ? 'Sem conexão com o TMDB' : `Ninguém apareceu em ${MIN_ACTOR_TITLES} títulos ainda`),
  );
  box.removeAttribute('aria-busy');
}

export function clearLifeStatsCache() {
  renderToken++;
  generation++;
  try { storage.remove(FACTS_STORAGE_KEY); } catch { /* sem localStorage: nada a apagar */ }
}

export function hideLifeStats() {
  renderToken++;
  const box = document.getElementById('dna-life');
  if (box) { box.hidden = true; box.replaceChildren(); }
}
