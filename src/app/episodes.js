// Rastreamento de episódios (004-series-tracking)
import { ph } from '../ui/phosphor.js';
import { canTrackEpisodes, getSeriesProgress, markEpisode, markEpisodes, unmarkEpisode } from './episodeStore.js';
import { salvarHistorico } from './library.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { pluralize } from '../utils/format.js';
import { toLibraryItem } from '../domain/mediaItem.js';
import { emit, on } from '../state/events.js';
import { cachedSeason, getAllSeasons, getSeason } from '../api/tmdbSeries.js';
import { buildEpisodeKey, episodeCode, parseEpisodeKey } from '../domain/seriesProgress.js';
import { registerActions } from '../ui/actions.js';
import { inHistory, inWatchlist, removeFromHistory, removeFromWatchlist } from './libraryStore.js';


// Séries e doramas mostram a seção de episódios; fechar o título esquece o que estava carregado
on('title:opened', ({ item }) => loadEpisodesSection(item));
on('title:closed', () => {
    session.episodes = { seriesId: null, watchedKeys: new Set(), seasonData: {} };
});

async function loadEpisodesSection(seriesData) {
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

    const progressResult = await getSeriesProgress(seriesId);
    session.episodes.watchedKeys = progressResult.watchedKeys || new Set();
    session.episodes.totalEpisodes = seriesData.number_of_episodes || 0;

    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);

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

async function renderEpisodeList(seriesId, seasonNumber) {
    const list = document.getElementById('episodes-list');
    if (!list) return;

    list.innerHTML = '<div class="episodes-loading">Carregando...</div>';

    let seasonData;
    try {
        seasonData = await getSeason(seriesId, seasonNumber);
    } catch {
        list.innerHTML = '<div class="episodes-loading">Erro ao carregar episódios.</div>';
        return;
    }

    const episodes = seasonData.episodes || [];
    if (episodes.length === 0) {
        list.innerHTML = '<div class="episodes-loading">Nenhum episódio encontrado.</div>';
        return;
    }

    list.innerHTML = `<div class="episodes-season-counter">${seasonCounter(seriesId, episodes)}</div>` + episodes.map(ep => {
        const key = buildEpisodeKey(seriesId, ep.season_number, ep.episode_number);
        const watched = session.episodes.watchedKeys.has(key);
        const code = episodeCode(ep.season_number, ep.episode_number);
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

async function onSeasonChange(seasonNumber) {
    if (!session.episodes.seriesId) return;
    await renderEpisodeList(session.episodes.seriesId, Number(seasonNumber));
}

async function toggleEpisode(seriesId, seasonNumber, episodeNumber, checked) {
    if (!canTrackEpisodes()) return;

    const key = buildEpisodeKey(seriesId, seasonNumber, episodeNumber);

    if (checked) {
        session.episodes.watchedKeys.add(key);
    } else {
        session.episodes.watchedKeys.delete(key);
    }

    const checkbox = document.querySelector(`.episode-checkbox[data-series="${seriesId}"][data-season="${seasonNumber}"][data-episode="${episodeNumber}"]`);
    if (checkbox) {
        checkbox.closest('.episode-item')?.classList.toggle('is-watched', checked);
    }
    updateSeasonCounter(seriesId, seasonNumber);

    let result;
    if (checked) {
        result = await markEpisode(seriesRef({ ...state.currentMovie, id: seriesId }), seasonNumber, episodeNumber);
    } else {
        result = await unmarkEpisode(seriesId, seasonNumber, episodeNumber);
    }

    if (!result.success) {
        if (checked) {
            session.episodes.watchedKeys.delete(key);
        } else {
            session.episodes.watchedKeys.add(key);
        }
        showToast('Erro ao salvar episódio', 'error');
        return;
    }

    if (checked) {
        const wasInWatchlist = (session.user.watchlist || []).find(i => i.id === seriesId);
        await moveSeriesOutOfWatchlist(seriesId);
        if (wasInWatchlist) showToast('Movido para Em Andamento');
    }

    updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);

    emit('library:changed'); // Em Andamento e o "Continue assistindo" do Início acompanham
}

// Começou a assistir: a série sai de "Quero Assistir" (vai para Em Andamento)
export async function moveSeriesOutOfWatchlist(seriesId) {
    if (inWatchlist(seriesId) && await removeFromWatchlist(seriesId)) emit('library:changed');
}

// Desmarcar episódios tira a série de "Já assistidos" (conta e convidado)
async function removeSeriesFromHistory(seriesId) {
    if (!inHistory(seriesId)) return;
    await removeFromHistory(seriesId);
    emit('library:changed'); // "Já assistidos" e o "Como foi?" do título aberto acompanham
}

// "3/10 assistidos · 7 restantes" (ou "Concluída!") da temporada mostrada
function seasonCounter(seriesId, episodes) {
    const watched = episodes.filter(ep =>
        session.episodes.watchedKeys.has(buildEpisodeKey(seriesId, ep.season_number, ep.episode_number))
    ).length;
    const remaining = episodes.length - watched;
    return `${watched}/${episodes.length} assistidos · ` + (remaining > 0
        ? `<strong>${remaining} ${pluralize(remaining, 'restante', 'restantes')}</strong>`
        : '<strong class="text-success">Concluída!</strong>');
}

function updateSeasonCounter(seriesId, seasonNumber) {
    const counter = document.querySelector('.episodes-season-counter');
    const seasonData = cachedSeason(seriesId, seasonNumber);
    if (counter && seasonData) counter.innerHTML = seasonCounter(seriesId, seasonData.episodes);
}

function updateSeriesWatchButton(seriesData, watchedKeys) {
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
        if (session.currentUser && !inHistory) {
            salvarHistorico(seriesData);
        }
        moveSeriesOutOfWatchlist(seriesData.id);
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

async function desmarcarTemporadaAtual() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesId = state.currentMovie.id;
    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);

    const btns = document.querySelectorAll('.episodes-mark-all-btn');
    btns.forEach(b => { b.disabled = true; });

    const toUnmark = [...session.episodes.watchedKeys].filter(k =>
        parseEpisodeKey(k)?.seriesId === seriesId && parseEpisodeKey(k).season === currentSeason
    );

    for (const key of toUnmark) {
        await unmarkEpisode(seriesId, currentSeason, parseEpisodeKey(key).episode);
        session.episodes.watchedKeys.delete(key);
    }

    await removeSeriesFromHistory(seriesId);

    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);
    emit('library:changed');

    btns.forEach(b => { b.disabled = false; });
    showToast(`Temporada ${currentSeason} desmarcada`);
}

async function desmarcarTodosEpisodios() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;

    const btns = document.querySelectorAll('.episodes-mark-all-btn');
    btns.forEach(b => { b.disabled = true; });

    const toUnmark = [...session.episodes.watchedKeys];
    for (const key of toUnmark) {
        const { season, episode } = parseEpisodeKey(key);
        await unmarkEpisode(seriesId, season, episode);
    }
    session.episodes.watchedKeys.clear();

    await removeSeriesFromHistory(seriesId);

    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    emit('library:changed');

    btns.forEach(b => { b.disabled = false; });
    showToast('Série desmarcada');
}

const seriesRef = seriesData => toLibraryItem(seriesData, 'tv');

// Marca de uma vez os episódios que faltam; devolve false se não gravou
async function markMissing(seriesData, episodes) {
    const missing = episodes.filter(ep =>
        !session.episodes.watchedKeys.has(buildEpisodeKey(seriesData.id, ep.season_number, ep.episode_number)));
    if (missing.length === 0) return true;
    const result = await markEpisodes(seriesRef(seriesData), missing);
    if (!result.success) {
        showToast('Erro ao salvar episódios', 'error');
        return false;
    }
    missing.forEach(ep => session.episodes.watchedKeys.add(buildEpisodeKey(seriesData.id, ep.season_number, ep.episode_number)));
    return true;
}

async function seasonEpisodes(seriesId, seasonNumber) {
    return (await getSeason(seriesId, seasonNumber)).episodes;
}

const markButtons = disabled => document.querySelectorAll('.episodes-mark-all-btn').forEach(b => { b.disabled = disabled; });

async function marcarTemporadaAtual() {
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
    if (ok) await moveSeriesOutOfWatchlist(seriesId);
    await renderEpisodeList(seriesId, currentSeason);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    emit('library:changed');
    markButtons(false);
    if (ok) showToast(`Temporada ${currentSeason} marcada!`);
}

// Todas as temporadas (sem a 0, de especiais). Usado pelo "Marcar série" e pelo "Já Vi" da série.
export async function markWholeSeries(seriesData) {
    if (!canTrackEpisodes() || !seriesData) return false;
    const numberOfSeasons = seriesData.number_of_seasons || 0;
    if (numberOfSeasons === 0) return false;

    const allSeasons = await getAllSeasons(seriesData.id, numberOfSeasons);
    const ok = await markMissing(seriesData, allSeasons.flatMap(season => season.episodes));

    // O título aberto pode ter mudado enquanto gravava: só redesenha se ainda for esta série
    if (state.currentMovie?.id === seriesData.id && session.episodes.seriesId === seriesData.id) {
        const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);
        await renderEpisodeList(seriesData.id, currentSeason);
        updateSeriesWatchButton(state.currentMovie, session.episodes.watchedKeys);
    }
    emit('library:changed');
    return ok;
}

// "Vi até aqui": marca este episódio e todos os anteriores (temporadas passadas inclusive).
// Não desmarca nada: o que vem depois continua como estava.
let markingUpTo = false;
async function marcarAteAqui(seasonNumber, episodeNumber) {
    if (!canTrackEpisodes() || !state.currentMovie || markingUpTo) return;
    const seriesData = state.currentMovie;
    const code = episodeCode(seasonNumber, episodeNumber);

    markingUpTo = true;
    markButtons(true);
    let ok = false;
    try {
        const seasons = await getAllSeasons(seriesData.id, seasonNumber);
        const upTo = seasons.flatMap(season => season.episodes)
            .filter(ep => ep.season_number < seasonNumber || ep.episode_number <= episodeNumber);
        ok = upTo.length > 0 && await markMissing(seriesData, upTo);
    } catch {
        showToast('Erro ao carregar episódios', 'error');
    }
    markingUpTo = false;
    markButtons(false);
    if (state.currentMovie !== seriesData) return;

    if (ok) await moveSeriesOutOfWatchlist(seriesData.id);
    await renderEpisodeList(seriesData.id, seasonNumber);
    updateSeriesWatchButton(seriesData, session.episodes.watchedKeys);
    emit('library:changed');
    // A lista foi redesenhada: o foco volta para o mesmo episódio
    document.querySelector(`.episode-item__upto[data-season="${seasonNumber}"][data-episode="${episodeNumber}"]`)?.focus();
    if (ok) showToast(`Marcado até ${code}`);
}

registerActions({
    click: {
        desmarcarTemporadaAtual,
        desmarcarTodosEpisodios,
        marcarTemporadaAtual,
        marcarAteAqui: el => marcarAteAqui(Number(el.dataset.season), Number(el.dataset.episode)),
    },
    change: {
        onSeasonChange: el => onSeasonChange(el.value),
        toggleEpisode: el => toggleEpisode(Number(el.dataset.series), Number(el.dataset.season), Number(el.dataset.episode), el.checked),
    },
});
