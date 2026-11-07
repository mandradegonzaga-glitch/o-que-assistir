// Rastreamento de episódios (004-series-tracking)
import { supabaseRemoveFromHistory, supabaseRemoveFromWatchlist } from '../api/supabase.js';
import { ph } from '../ui/phosphor.js';
import { canTrackEpisodes, getSeriesProgress, markEpisode, markEpisodes, unmarkEpisode } from './episodeStore.js';
import { saveGuestHistory, saveGuestWatchlist } from './guestLibrary.js';
import { tmdbGet } from '../api/tmdb.js';
import { renderLibrary, salvarHistorico } from './library.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { cache } from '../utils/cache.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { pluralize } from '../utils/format.js';

// ================================================
// UP NEXT — helpers da aba "Em Andamento" (004-series-tracking)
// O widget do topo foi removido na 004; restam cache de temporadas e funções puras.
// ================================================

// Cache local para seasons (TTL 1h) — evita duplicar lógica do src/api/tmdbSeries.js

export async function fetchAllSeasonsLocal(seriesId, numberOfSeasons) {
    const seasonNumbers = Array.from({ length: numberOfSeasons }, (_, i) => i + 1);
    const results = await Promise.all(seasonNumbers.map(async n => {
        const key = `season-${seriesId}-${n}`;
        let data = cache.get(key);
        if (!data) {
            let json;
            try {
                json = await tmdbGet(`/tv/${seriesId}/season/${n}`);
            } catch {
                return null;
            }
            data = {
                season_number: json.season_number,
                // Mesmo formato da lista de episódios: a lista reaproveita este cache e precisa dos nomes
                episodes: (json.episodes || []).map(ep => ({
                    season_number: ep.season_number,
                    episode_number: ep.episode_number,
                    name: ep.name || `Episódio ${ep.episode_number}`,
                })),
            };
            cache.set(key, data, 3_600_000); // 1h
        }
        return data;
    }));
    // Filtrar nulls e Season 0
    return results.filter(s => s && s.season_number !== 0);
}

// Atualiza a aba Em Andamento se estiver visível

export function refreshUpNextWidget() {
    if (state.tab === 'andando') {
        renderLibrary();
    }
}

export async function loadEpisodesSection(seriesData) {
    const section = document.getElementById('episodes-section');
    const select = document.getElementById('episodes-season-select');
    const list = document.getElementById('episodes-list');
    if (!section || !select || !list) return;

    if (!canTrackEpisodes()) {
        section.hidden = true;
        return;
    }

    const mediaType = seriesData.media_type || '';
    if (mediaType !== 'tv' && mediaType !== 'dorama') {
        section.hidden = true;
        return;
    }

    section.hidden = false;
    list.innerHTML = '<div class="episodes-loading">Carregando episódios...</div>';

    const seriesId = seriesData.id;
    const numberOfSeasons = seriesData.number_of_seasons || 0;
    session.episodes.seriesId = seriesId;

    // Buscar chaves assistidas do Supabase
    const progressResult = await getSeriesProgress(seriesId);
    session.episodes.watchedKeys = progressResult.watchedKeys || new Set();
    session.episodes.totalEpisodes = seriesData.number_of_episodes || 0;

    // Atualizar status badge e btn-visto
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);

    // Preencher selector de temporadas (sem Season 0)
    select.innerHTML = '';
    for (let s = 1; s <= numberOfSeasons; s++) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = `Temporada ${s}`;
        select.appendChild(opt);
    }

    if (numberOfSeasons > 0) {
        await renderEpisodeList(seriesId, 1);
    } else {
        list.innerHTML = '<div class="episodes-loading">Nenhuma temporada disponível.</div>';
    }
}

export async function renderEpisodeList(seriesId, seasonNumber) {
    const list = document.getElementById('episodes-list');
    if (!list) return;

    list.innerHTML = '<div class="episodes-loading">Carregando...</div>';

    // Usar cache local (fetchAllSeasonsLocal já existe, mas precisamos de uma season só)
    const cacheKey = `season-${seriesId}-${seasonNumber}`;
    let seasonData = cache.get(cacheKey);
    if (!seasonData) {
        try {
            const json = await tmdbGet(`/tv/${seriesId}/season/${seasonNumber}`);
            seasonData = {
                season_number: json.season_number,
                episodes: (json.episodes || []).map(ep => ({
                    season_number: ep.season_number,
                    episode_number: ep.episode_number,
                    name: ep.name || `Episódio ${ep.episode_number}`,
                })),
            };
            cache.set(cacheKey, seasonData, 3_600_000);
        } catch {
            list.innerHTML = '<div class="episodes-loading">Erro ao carregar episódios.</div>';
            return;
        }
    }

    const episodes = seasonData.episodes || [];
    if (episodes.length === 0) {
        list.innerHTML = '<div class="episodes-loading">Nenhum episódio encontrado.</div>';
        return;
    }

    const watchedInSeason = episodes.filter(ep =>
        session.episodes.watchedKeys.has(`${seriesId}-s${ep.season_number}-e${ep.episode_number}`)
    ).length;
    const remainingInSeason = episodes.length - watchedInSeason;
    const seasonCounterHtml = `
        <div class="episodes-season-counter">
            ${watchedInSeason}/${episodes.length} assistidos
            ${remainingInSeason > 0 ? `· <strong>${remainingInSeason} ${pluralize(remainingInSeason, 'restante', 'restantes')}</strong>` : '· <strong class="text-success">Concluída!</strong>'}
        </div>`;

    list.innerHTML = seasonCounterHtml + episodes.map(ep => {
        const key = `${seriesId}-s${ep.season_number}-e${ep.episode_number}`;
        const watched = session.episodes.watchedKeys.has(key);
        const code = `T${String(ep.season_number).padStart(2,'0')}E${String(ep.episode_number).padStart(2,'0')}`;
        const name = ep.name || `Episódio ${ep.episode_number}`; // cache antigo sem nome
        return `
            <div class="episode-item ${watched ? 'is-watched' : ''}" role="listitem">
                <label class="episode-item__main">
                    <input
                        type="checkbox"
                        class="episode-checkbox"
                        ${watched ? 'checked' : ''}
                        data-change="toggleEpisode" data-series="${seriesId}" data-season="${ep.season_number}" data-episode="${ep.episode_number}"
                        aria-label="${code} — ${escapeHtml(name)}">
                    <span class="episode-item__code">${code}</span>
                    <span class="episode-item__label">${escapeHtml(name)}</span>
                </label>
                <button type="button" class="episode-item__upto" data-action="marcarAteAqui" data-season="${ep.season_number}" data-episode="${ep.episode_number}" aria-label="Vi até ${code}: marca este e todos os anteriores">Vi até aqui</button>
            </div>`;
    }).join('');
}

export async function onSeasonChange(seasonNumber) {
    if (!session.episodes.seriesId) return;
    await renderEpisodeList(session.episodes.seriesId, Number(seasonNumber));
}

export async function toggleEpisode(seriesId, seasonNumber, episodeNumber, checked) {
    if (!canTrackEpisodes()) return;

    const key = `${seriesId}-s${seasonNumber}-e${episodeNumber}`;

    // Atualizar estado local imediatamente (otimista)
    if (checked) {
        session.episodes.watchedKeys.add(key);
    } else {
        session.episodes.watchedKeys.delete(key);
    }

    // Atualizar classe visual do item e contador da temporada
    const checkbox = document.querySelector(`.episode-checkbox[data-series="${seriesId}"][data-season="${seasonNumber}"][data-episode="${episodeNumber}"]`);
    if (checkbox) {
        checkbox.closest('.episode-item')?.classList.toggle('is-watched', checked);
    }
    _updateSeasonCounter(seriesId, seasonNumber);

    // Persistir no Supabase
    let result;
    if (checked) {
        const seriesData = state.currentMovie;
        result = await markEpisode({
            id: seriesId,
            title: seriesData?.name || seriesData?.title || '',
            poster: seriesData?.poster_path || null,
            type: seriesData?.media_type || 'tv',
        }, seasonNumber, episodeNumber);
    } else {
        result = await unmarkEpisode(seriesId, seasonNumber, episodeNumber);
    }

    if (!result.success) {
        // Reverter estado otimista em caso de erro
        if (checked) {
            session.episodes.watchedKeys.delete(key);
        } else {
            session.episodes.watchedKeys.add(key);
        }
        showToast('Erro ao salvar episódio', 'error');
        return;
    }

    // Se marcou um episódio e série está no Quero Assistir → mover para Em Andamento
    if (checked) {
        const wasInWatchlist = (session.user.watchlist || []).find(i => i.id === seriesId);
        await _moveFromWatchlistIfNeeded(seriesId);
        if (wasInWatchlist) showToast('Movido para Em Andamento');
    }

    // Atualizar status badge e btn-visto (pode acionar Já Assistido se completo)
    updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);

    // Wiring T001-010: atualizar Up Next após mudança
    refreshUpNextWidget();
}

export async function _moveFromWatchlistIfNeeded(seriesId) {
    if (!canTrackEpisodes()) return;
    const inWatchlist = (session.user.watchlist || []).find(i => i.id === seriesId);
    if (inWatchlist) {
        if (session.currentUser !== 'guest') await supabaseRemoveFromWatchlist(session.currentUserId, seriesId);
        session.user.watchlist = (session.user.watchlist || []).filter(i => i.id !== seriesId);
        if (session.currentUser === 'guest') saveGuestWatchlist(session.user.watchlist);
    }
}

// Desmarcar episódios tira a série de "Já assistidos" (conta e convidado)
async function removeSeriesFromHistory(seriesId) {
    if (!session.user.history.find(h => h.id === seriesId)) return;
    if (session.currentUser === 'guest') {
        session.user.history = session.user.history.filter(h => h.id !== seriesId);
        saveGuestHistory(session.user.history);
    } else {
        await supabaseRemoveFromHistory(session.currentUserId, seriesId);
        session.user.history = session.user.history.filter(h => h.id !== seriesId);
    }
    renderLibrary(); // "Já assistidos" e o "Como foi?" do título aberto acompanham
}

export function _updateSeasonCounter(seriesId, seasonNumber) {
    const counter = document.querySelector('.episodes-season-counter');
    if (!counter) return;
    const cacheKey = `season-${seriesId}-${seasonNumber}`;
    const seasonData = cache.get(cacheKey);
    if (!seasonData) return;
    const episodes = seasonData.episodes || [];
    const watchedInSeason = episodes.filter(ep =>
        session.episodes.watchedKeys.has(`${seriesId}-s${ep.season_number}-e${ep.episode_number}`)
    ).length;
    const remaining = episodes.length - watchedInSeason;
    counter.innerHTML = `${watchedInSeason}/${episodes.length} assistidos · ` +
        (remaining > 0
            ? `<strong>${remaining} ${pluralize(remaining, 'restante', 'restantes')}</strong>`
            : `<strong class="text-success">Concluída!</strong>`);
}

export function updateSeriesWatchButton(seriesData, watchedKeys) {
    if (!seriesData) return;
    const btnV = document.getElementById('btn-visto');
    const badge = document.getElementById('episodes-status-badge');
    if (!btnV) return;

    const totalEps = seriesData.number_of_episodes || session.episodes.totalEpisodes || 0;
    const watchedCount = watchedKeys.size;
    const isCompleted = totalEps > 0 && watchedCount >= totalEps;
    const isStarted = watchedCount > 0;

    // "Já vi" fica sempre disponível: dá para marcar a série inteira sem passar episódio por episódio
    const inHistory = !!(session.user.history || []).find(h => h.id === seriesData.id);
    setSeriesSeenButton(btnV, inHistory || isCompleted);

    if (isCompleted) {
        if (badge) {
            badge.textContent = 'Concluído';
            badge.className = 'episodes-status-badge status-completed';
            badge.hidden = false;
        }
        // Auto-adicionar ao histórico se ainda não estiver
        if (session.currentUser && !inHistory) {
            salvarHistorico(seriesData);
        }
        // Remover do Quero Assistir se ainda estiver lá
        _moveFromWatchlistIfNeeded(seriesData.id);
    } else if (isStarted) {
        if (badge) {
            badge.textContent = 'Assistindo';
            badge.className = 'episodes-status-badge status-watching';
            badge.hidden = false;
        }
    } else if (badge) {
        badge.hidden = true;
    }
}

const CHECK_ICON = ph('check', { weight: 'bold', cls: 'icon icon-16 icon-lead-4' });

// Mesmo botão dos filmes: "Já Vi" (ativo) ou "JÁ VISTO" (desativado)
export function setSeriesSeenButton(btnV, seen) {
    btnV.innerHTML = CHECK_ICON + (seen ? 'JÁ VISTO' : 'Já Vi');
    btnV.disabled = seen;
}

export async function desmarcarTemporadaAtual() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesId = state.currentMovie.id;
    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);

    const btns = document.querySelectorAll('.episodes-mark-all-btn');
    btns.forEach(b => { b.disabled = true; });

    // Coletar chaves da temporada atual que estão marcadas
    const toUnmark = [...session.episodes.watchedKeys].filter(k =>
        k.startsWith(`${seriesId}-s${currentSeason}-`)
    );

    for (const key of toUnmark) {
        const parts = key.split('-');
        const epNum = Number(parts[parts.length - 1].replace('e', ''));
        await unmarkEpisode(seriesId, currentSeason, epNum);
        session.episodes.watchedKeys.delete(key);
    }

    // Se série estava concluída, remove do histórico também
    await removeSeriesFromHistory(seriesId);

    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);
    refreshUpNextWidget();

    btns.forEach(b => { b.disabled = false; });
    showToast(`Temporada ${currentSeason} desmarcada`);
}

export async function desmarcarTodosEpisodios() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;

    const btns = document.querySelectorAll('.episodes-mark-all-btn');
    btns.forEach(b => { b.disabled = true; });

    // Desmarcar todos os episódios assistidos dessa série
    const toUnmark = [...session.episodes.watchedKeys];
    for (const key of toUnmark) {
        const parts = key.split('-');
        const seasonNum = Number(parts[1].replace('s', ''));
        const epNum = Number(parts[2].replace('e', ''));
        await unmarkEpisode(seriesId, seasonNum, epNum);
    }
    session.episodes.watchedKeys.clear();

    // Remover do histórico também
    await removeSeriesFromHistory(seriesId);

    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    refreshUpNextWidget();

    btns.forEach(b => { b.disabled = false; });
    showToast('Série desmarcada');
}

const seriesRef = seriesData => ({
    id: seriesData.id,
    title: seriesData.name || seriesData.title || '',
    poster: seriesData.poster_path || null,
    type: seriesData.media_type || 'tv',
});

// Marca de uma vez os episódios que faltam; devolve false se não gravou
async function markMissing(seriesData, episodes) {
    const missing = episodes.filter(ep =>
        !session.episodes.watchedKeys.has(`${seriesData.id}-s${ep.season_number}-e${ep.episode_number}`));
    if (missing.length === 0) return true;
    const result = await markEpisodes(seriesRef(seriesData), missing);
    if (!result.success) {
        showToast('Erro ao salvar episódios', 'error');
        return false;
    }
    missing.forEach(ep => session.episodes.watchedKeys.add(`${seriesData.id}-s${ep.season_number}-e${ep.episode_number}`));
    return true;
}

async function seasonEpisodes(seriesId, seasonNumber) {
    const cacheKey = `season-${seriesId}-${seasonNumber}`;
    let seasonData = cache.get(cacheKey);
    if (!seasonData) {
        const json = await tmdbGet(`/tv/${seriesId}/season/${seasonNumber}`);
        seasonData = {
            season_number: json.season_number,
            episodes: (json.episodes || []).map(ep => ({
                season_number: ep.season_number,
                episode_number: ep.episode_number,
                name: ep.name || `Episódio ${ep.episode_number}`,
            })),
        };
        cache.set(cacheKey, seasonData, 3_600_000);
    }
    return seasonData.episodes || [];
}

const markButtons = disabled => document.querySelectorAll('.episodes-mark-all-btn').forEach(b => { b.disabled = disabled; });

export async function marcarTemporadaAtual() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;
    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);

    markButtons(true);
    let ok = false;
    try {
        ok = await markMissing(seriesData, await seasonEpisodes(seriesId, currentSeason));
    } catch {
        showToast('Erro ao carregar episódios', 'error');
    }
    if (ok) await _moveFromWatchlistIfNeeded(seriesId);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    refreshUpNextWidget();
    markButtons(false);
    if (ok) showToast(`Temporada ${currentSeason} marcada!`);
}

// Todas as temporadas (sem a 0, de especiais). Usado pelo "Marcar série" e pelo "Já Vi" da série.
export async function markWholeSeries(seriesData) {
    if (!canTrackEpisodes() || !seriesData) return false;
    const numberOfSeasons = seriesData.number_of_seasons || 0;
    if (numberOfSeasons === 0) return false;

    const allSeasons = await fetchAllSeasonsLocal(seriesData.id, numberOfSeasons);
    const ok = await markMissing(seriesData, allSeasons.flatMap(season => season.episodes));

    // O título aberto pode ter mudado enquanto gravava: só redesenha se ainda for esta série
    if (state.currentMovie?.id === seriesData.id && session.episodes.seriesId === seriesData.id) {
        const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);
        await renderEpisodeList(seriesData.id, currentSeason);
        updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);
    }
    refreshUpNextWidget();
    return ok;
}

// "Vi até aqui": marca este episódio e todos os anteriores (temporadas passadas inclusive).
// Não desmarca nada: o que vem depois continua como estava.
let markingUpTo = false;
export async function marcarAteAqui(seasonNumber, episodeNumber) {
    if (!canTrackEpisodes() || !state.currentMovie || markingUpTo) return;
    const seriesData = state.currentMovie;
    const code = `T${String(seasonNumber).padStart(2,'0')}E${String(episodeNumber).padStart(2,'0')}`;

    markingUpTo = true;
    markButtons(true);
    let ok = false;
    try {
        const seasons = await fetchAllSeasonsLocal(seriesData.id, seasonNumber);
        const upTo = seasons.flatMap(season => season.episodes)
            .filter(ep => ep.season_number < seasonNumber || ep.episode_number <= episodeNumber);
        ok = upTo.length > 0 && await markMissing(seriesData, upTo);
    } catch {
        showToast('Erro ao carregar episódios', 'error');
    }
    markingUpTo = false;
    markButtons(false);
    if (state.currentMovie !== seriesData) return;

    if (ok) await _moveFromWatchlistIfNeeded(seriesData.id);
    await renderEpisodeList(seriesData.id, seasonNumber);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    refreshUpNextWidget();
    // A lista foi redesenhada: o foco volta para o mesmo episódio
    document.querySelector(`.episode-item__upto[data-season="${seasonNumber}"][data-episode="${episodeNumber}"]`)?.focus();
    if (ok) showToast(`Marcado até ${code}`);
}
