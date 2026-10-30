// Rastreamento de episódios (004-series-tracking)
import { supabaseGetSeriesProgress, supabaseMarkEpisodeWatched, supabaseRemoveFromHistory, supabaseRemoveFromWatchlist, supabaseUnmarkEpisodeWatched } from '../api/supabase.js';
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
                episodes: (json.episodes || []).map(ep => ({
                    season_number: ep.season_number,
                    episode_number: ep.episode_number,
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

    if (!session.currentUserId || session.currentUser === 'guest') {
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
    const progressResult = await supabaseGetSeriesProgress(session.currentUserId, seriesId);
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
        return `
            <label class="episode-item ${watched ? 'is-watched' : ''}" role="listitem">
                <input
                    type="checkbox"
                    class="episode-checkbox"
                    ${watched ? 'checked' : ''}
                    data-change="toggleEpisode" data-series="${seriesId}" data-season="${ep.season_number}" data-episode="${ep.episode_number}"
                    aria-label="${code} — ${escapeHtml(ep.name)}">
                <span class="episode-item__code">${code}</span>
                <span class="episode-item__label">${escapeHtml(ep.name)}</span>
            </label>`;
    }).join('');
}

export async function onSeasonChange(seasonNumber) {
    if (!session.episodes.seriesId) return;
    await renderEpisodeList(session.episodes.seriesId, Number(seasonNumber));
}

export async function toggleEpisode(seriesId, seasonNumber, episodeNumber, checked) {
    if (!session.currentUserId) return;

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
        result = await supabaseMarkEpisodeWatched(session.currentUserId, {
            id: seriesId,
            title: seriesData?.name || seriesData?.title || '',
            poster: seriesData?.poster_path || null,
            type: seriesData?.media_type || 'tv',
        }, seasonNumber, episodeNumber);
    } else {
        result = await supabaseUnmarkEpisodeWatched(session.currentUserId, seriesId, seasonNumber, episodeNumber);
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
    if (!session.currentUserId) return;
    const inWatchlist = (session.user.watchlist || []).find(i => i.id === seriesId);
    if (inWatchlist) {
        await supabaseRemoveFromWatchlist(session.currentUserId, seriesId);
        session.user.watchlist = (session.user.watchlist || []).filter(i => i.id !== seriesId);
    }
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

    const checkIcon = '<svg aria-hidden="true" class="icon icon-16 icon-lead-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';

    if (isCompleted) {
        btnV.innerHTML = checkIcon + 'JÁ VISTO';
        btnV.disabled = true;
        btnV.classList.add('btn-green');
        if (badge) {
            badge.textContent = 'Concluído';
            badge.className = 'episodes-status-badge status-completed';
            badge.hidden = false;
        }
        // Auto-adicionar ao histórico se ainda não estiver
        if (session.currentUserId && !session.user.history.find(h => h.id === seriesData.id)) {
            salvarHistorico(seriesData);
        }
        // Remover do Quero Assistir se ainda estiver lá
        _moveFromWatchlistIfNeeded(seriesData.id);
    } else if (isStarted) {
        btnV.innerHTML = checkIcon + 'Assistindo';
        btnV.disabled = true;
        btnV.classList.remove('btn-green');
        if (badge) {
            badge.textContent = 'Assistindo';
            badge.className = 'episodes-status-badge status-watching';
            badge.hidden = false;
        }
    } else {
        btnV.innerHTML = checkIcon + 'Assistindo';
        btnV.disabled = true;
        btnV.classList.remove('btn-green');
        if (badge) badge.hidden = true;
    }
}

export async function desmarcarTemporadaAtual() {
    if (!session.currentUserId || !state.currentMovie) return;

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
        await supabaseUnmarkEpisodeWatched(session.currentUserId, seriesId, currentSeason, epNum);
        session.episodes.watchedKeys.delete(key);
    }

    // Se série estava concluída, remove do histórico também
    if (session.user.history.find(h => h.id === seriesId)) {
        await supabaseRemoveFromHistory(session.currentUserId, seriesId);
        session.user.history = session.user.history.filter(h => h.id !== seriesId);
    }

    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);
    refreshUpNextWidget();

    btns.forEach(b => { b.disabled = false; });
    showToast(`Temporada ${currentSeason} desmarcada`);
}

export async function desmarcarTodosEpisodios() {
    if (!session.currentUserId || !state.currentMovie) return;

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
        await supabaseUnmarkEpisodeWatched(session.currentUserId, seriesId, seasonNum, epNum);
    }
    session.episodes.watchedKeys.clear();

    // Remover do histórico também
    if (session.user.history.find(h => h.id === seriesId)) {
        await supabaseRemoveFromHistory(session.currentUserId, seriesId);
        session.user.history = session.user.history.filter(h => h.id !== seriesId);
    }

    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    refreshUpNextWidget();

    btns.forEach(b => { b.disabled = false; });
    showToast('Série desmarcada');
}

export async function marcarTemporadaAtual() {
    if (!session.currentUserId || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;
    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);

    const btns = document.querySelectorAll('.episodes-mark-all-btn');
    btns.forEach(b => { b.disabled = true; });

    const cacheKey = `season-${seriesId}-${currentSeason}`;
    let seasonData = cache.get(cacheKey);
    if (!seasonData) {
        const json = await tmdbGet(`/tv/${seriesId}/season/${currentSeason}`);
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

    const series = {
        id: seriesId,
        title: seriesData.name || seriesData.title || '',
        poster: seriesData.poster_path || null,
        type: seriesData.media_type || 'tv',
    };

    for (const ep of seasonData.episodes) {
        const key = `${seriesId}-s${ep.season_number}-e${ep.episode_number}`;
        if (session.episodes.watchedKeys.has(key)) continue;
        await supabaseMarkEpisodeWatched(session.currentUserId, series, ep.season_number, ep.episode_number);
        session.episodes.watchedKeys.add(key);
    }

    await _moveFromWatchlistIfNeeded(seriesId);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    refreshUpNextWidget();

    btns.forEach(b => { b.disabled = false; });
    showToast(`Temporada ${currentSeason} marcada!`);
}

export async function marcarTodosEpisodios() {
    if (!session.currentUserId || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;
    const numberOfSeasons = seriesData.number_of_seasons || 0;
    if (numberOfSeasons === 0) return;

    const btn = document.querySelector('[data-action="marcarTodosEpisodios"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Marcando...'; }

    // Buscar todas as seasons e marcar todos os episódios
    const allSeasons = await fetchAllSeasonsLocal(seriesId, numberOfSeasons);
    const series = {
        id: seriesId,
        title: seriesData.name || seriesData.title || '',
        poster: seriesData.poster_path || null,
        type: seriesData.media_type || 'tv',
    };

    for (const season of allSeasons) {
        for (const ep of season.episodes) {
            const key = `${seriesId}-s${ep.season_number}-e${ep.episode_number}`;
            if (session.episodes.watchedKeys.has(key)) continue; // já marcado
            await supabaseMarkEpisodeWatched(session.currentUserId, series, ep.season_number, ep.episode_number);
            session.episodes.watchedKeys.add(key);
        }
    }

    await _moveFromWatchlistIfNeeded(seriesId);
    // Re-renderizar a season atual com todos marcados
    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    refreshUpNextWidget();

    if (btn) { btn.disabled = false; btn.textContent = 'Marcar série'; }
    showToast('Todos os episódios marcados!');
}
