// Rastreamento de episódios (004-series-tracking)
import { ph } from '../ui/phosphor.js';
import { canTrackEpisodes, clearSeries, getSeriesProgress, markEpisode, markEpisodes, unmarkEpisode, unmarkSeason } from './episodeStore.js';
import { salvarHistorico } from './library.js';
import { emptyEpisodes, session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { pluralize } from '../utils/format.js';
import { isSeriesType, toLibraryItem } from '../domain/mediaItem.js';
import { emit, on } from '../state/events.js';
import { cachedSeason, getAllSeasons, getSeason } from '../api/tmdbSeries.js';
import { buildEpisodeKey, episodeCode, parseEpisodeKey } from '../domain/seriesProgress.js';
import { registerActions } from '../ui/actions.js';
import { inHistory, inWatchlist, removeFromHistory, removeFromWatchlist } from './libraryStore.js';


// Séries e doramas mostram a seção de episódios; fechar o título esquece o que estava carregado
on('title:opened', ({ item }) => loadEpisodesSection(item));
on('title:closed', () => {
    session.episodes = emptyEpisodes();
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
    if (!isSeriesType(mediaType)) {
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

    renderSeriesStatus(seriesData);

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

    const { leftWatchlist } = await syncSeriesStatus(state.currentMovie);
    if (leftWatchlist) showToast('Movido para Em Andamento');
    renderSeriesStatus(state.currentMovie);
    emit('library:changed'); // Em Andamento e o "Continue assistindo" do Início acompanham
}

// A série na biblioteca acompanha os episódios. Começou: sai de "Quero Assistir" (vai para
// Em Andamento). Terminou: entra em "Já assistidos". Desmarcou em lote: sai de "Já assistidos".
// Não avisa 'library:changed': quem fez a ação avisa uma vez, no fim.
async function syncSeriesStatus(series, { unmarked = false } = {}) {
    const watched = session.episodes.watchedKeys.size;
    const total = series.number_of_episodes || 0;
    const leftWatchlist = watched > 0 && inWatchlist(series.id) && await removeFromWatchlist(series.id);
    if (unmarked) await removeFromHistory(series.id);
    else if (total > 0 && watched >= total && !inHistory(series.id)) await salvarHistorico(series);
    return { leftWatchlist };
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

// Selo "Assistindo"/"Concluído" e o botão "Já Vi" da série aberta; só desenha
function renderSeriesStatus(seriesData) {
    const btnV = document.getElementById('btn-visto');
    const badge = document.getElementById('episodes-status-badge');
    if (!seriesData || !btnV) return;

    const total = seriesData.number_of_episodes || 0;
    const watched = session.episodes.watchedKeys.size;
    const isCompleted = total > 0 && watched >= total;
    setSeenButton(btnV, inHistory(seriesData.id) || isCompleted);

    if (!badge) return;
    badge.hidden = watched === 0;
    badge.textContent = isCompleted ? 'Concluído' : 'Assistindo';
    badge.className = `episodes-status-badge ${isCompleted ? 'status-completed' : 'status-watching'}`;
}

const CHECK_ICON = ph('check', { weight: 'bold', cls: 'icon icon-16 icon-lead-4' });

// Botão "Já Vi" (ativo) ou "JÁ VISTO" (desativado), de filmes e séries
export function setSeenButton(btnV, seen) {
    btnV.innerHTML = CHECK_ICON + (seen ? 'JÁ VISTO' : 'Já Vi');
    btnV.disabled = seen;
}

async function desmarcarTemporadaAtual() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesId = state.currentMovie.id;
    const currentSeason = Number(document.getElementById('episodes-season-select')?.value || 1);

    markButtons(true);
    const result = await unmarkSeason(seriesId, currentSeason);
    if (result.success) {
        [...session.episodes.watchedKeys]
            .filter(k => parseEpisodeKey(k)?.season === currentSeason)
            .forEach(k => session.episodes.watchedKeys.delete(k));
        await syncSeriesStatus(state.currentMovie, { unmarked: true });
    }
    await afterBulkChange(state.currentMovie, currentSeason);
    if (result.success) showToast(`Temporada ${currentSeason} desmarcada`);
    else showToast('Erro ao desmarcar episódios', 'error');
}

async function desmarcarTodosEpisodios() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;

    markButtons(true);
    const result = await clearSeries(seriesId);
    if (result.success) {
        session.episodes.watchedKeys.clear();
        await syncSeriesStatus(seriesData, { unmarked: true });
    }
    await afterBulkChange(seriesData, selectedSeason());
    if (result.success) showToast('Série desmarcada');
    else showToast('Erro ao desmarcar episódios', 'error');
}

const seriesRef = seriesData => toLibraryItem(seriesData, 'tv');
const markButtons = disabled => document.querySelectorAll('.episodes-mark-all-btn').forEach(b => { b.disabled = disabled; });
const selectedSeason = () => Number(document.getElementById('episodes-season-select')?.value || 1);

// Depois de marcar ou desmarcar em lote: lista, selo e botões de novo, e a biblioteca acompanha.
// O título aberto pode ter mudado enquanto gravava: só redesenha se ainda for esta série.
async function afterBulkChange(seriesData, season) {
    markButtons(false);
    if (state.currentMovie?.id === seriesData.id && session.episodes.seriesId === seriesData.id) {
        await renderEpisodeList(seriesData.id, season);
        renderSeriesStatus(state.currentMovie);
    }
    emit('library:changed');
}

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


async function marcarTemporadaAtual() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesData = state.currentMovie;
    const seriesId = seriesData.id;
    const currentSeason = selectedSeason();

    markButtons(true);
    let ok = false;
    try {
        ok = await markMissing(seriesData, await seasonEpisodes(seriesId, currentSeason));
    } catch {
        showToast('Erro ao carregar episódios', 'error');
    }
    if (ok) await syncSeriesStatus(seriesData);
    await afterBulkChange(seriesData, currentSeason);
    if (ok) showToast(`Temporada ${currentSeason} marcada!`);
}

// Todas as temporadas (sem a 0, de especiais). Usado pelo "Marcar série" e pelo "Já Vi" da série.
export async function markWholeSeries(seriesData) {
    if (!canTrackEpisodes() || !seriesData) return false;
    const numberOfSeasons = seriesData.number_of_seasons || 0;
    if (numberOfSeasons === 0) return false;

    const allSeasons = await getAllSeasons(seriesData.id, numberOfSeasons);
    const ok = await markMissing(seriesData, allSeasons.flatMap(season => season.episodes));

    if (ok) await syncSeriesStatus(seriesData);
    await afterBulkChange(seriesData, selectedSeason());
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
    if (ok) await syncSeriesStatus(seriesData);
    await afterBulkChange(seriesData, seasonNumber);
    if (state.currentMovie !== seriesData) return;
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
