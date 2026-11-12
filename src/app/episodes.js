// Rastreamento de episódios (004-series-tracking)
import { ph } from '../ui/phosphor.js';
import { canTrackEpisodes, clearSeries, getSeriesProgress, markEpisode, markEpisodes, unmarkEpisode, unmarkSeason } from './episodeStore.js';
import { isRemovingWatched, salvarHistorico } from './library.js';
import { emptyEpisodes, session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatDay, joinMeta, pluralize } from '../utils/format.js';
import { isSeriesType, toLibraryItem } from '../domain/mediaItem.js';
import { emit, on } from '../state/events.js';
import { cachedSeason, getAllSeasons, getSeason } from '../api/tmdbSeries.js';
import { buildEpisodeKey, episodeCode, parseEpisodeKey, seriesUpNext } from '../domain/seriesProgress.js';
import { tmdbImage } from '../domain/mediaItem.js';
import { registerActions } from '../ui/actions.js';
import { inHistory, inWatchlist, removeFromHistory, removeFromWatchlist } from './libraryStore.js';


// Séries e doramas mostram a seção de episódios; fechar o título esquece o que estava carregado
on('title:opened', ({ item }) => loadEpisodesSection(item));
on('title:closed', () => {
    session.episodes = emptyEpisodes();
});

async function loadEpisodesSection(seriesData) {
    const section = document.getElementById('episodes-section');
    const seasons = document.getElementById('episodes-seasons');
    const list = document.getElementById('episodes-list');
    if (!section || !seasons || !list) return;
    document.getElementById('m-series-progress').hidden = true; // a do título anterior não fica

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
    setEpisodesOpen(true); // cada título abre com os episódios à vista
    list.innerHTML = '<div class="episodes-loading">Carregando episódios...</div>';

    const seriesId = seriesData.id;
    const numberOfSeasons = seriesData.number_of_seasons || 0;
    session.episodes.seriesId = seriesId;

    const progressResult = await getSeriesProgress(seriesId);
    session.episodes.watchedKeys = progressResult.watchedKeys || new Set();

    renderSeriesStatus(seriesData);

    seasons.innerHTML = Array.from({ length: numberOfSeasons }, (_, i) =>
        `<button type="button" class="season-pill" data-action="escolherTemporada" data-season="${i + 1}" aria-pressed="${i === 0}">Temporada ${i + 1}</button>`).join('');
    seasons.hidden = numberOfSeasons < 2; // uma temporada só: não há o que escolher

    if (numberOfSeasons > 0) {
        await renderEpisodeList(seriesId, 1);
    } else {
        list.innerHTML = '<div class="episodes-loading">Nenhuma temporada disponível.</div>';
    }
}

async function renderEpisodeList(seriesId, seasonNumber) {
    const list = document.getElementById('episodes-list');
    const summary = document.getElementById('episodes-summary');
    if (!list) return;

    summary.innerHTML = '';
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

    renderSeasonSummary(seriesId, episodes);
    list.innerHTML = episodes.map(ep => episodeHtml(seriesId, ep)).join('');
}

// Episódio: foto da cena, código, nome inteiro (até 2 linhas), data e o "visto" à direita.
// A linha toda (menos o "Vi até aqui") marca e desmarca, como o checkbox
function episodeHtml(seriesId, ep) {
    const key = buildEpisodeKey(seriesId, ep.season_number, ep.episode_number);
    const watched = session.episodes.watchedKeys.has(key);
    const code = episodeCode(ep.season_number, ep.episode_number);
    const name = ep.name || `Episódio ${ep.episode_number}`; // cache antigo sem nome
    const still = tmdbImage(ep.still_path, 'w300');
    const date = formatDay(ep.air_date);
    const image = still
        ? `<img class="episode-item__still" src="${still}" alt="" width="300" height="169" loading="lazy">`
        : '<span class="episode-item__still" aria-hidden="true"></span>';
    return `
        <div class="episode-item ${watched ? 'is-watched' : ''}" role="listitem">
            <label class="episode-item__main">
                ${image}
                <span class="episode-item__info">
                    <span class="episode-item__code">${code}</span>
                    <span class="episode-item__label">${escapeHtml(name)}</span>
                    ${date ? `<span class="episode-item__date">${date}</span>` : ''}
                </span>
                <input
                    type="checkbox"
                    class="episode-checkbox"
                    ${watched ? 'checked' : ''}
                    data-change="toggleEpisode" data-series="${seriesId}" data-season="${ep.season_number}" data-episode="${ep.episode_number}"
                    aria-label="${code} — ${escapeHtml(name)}">
            </label>
            ${ep.overview ? `<button type="button" class="episode-item__overview" data-action="alternarSinopse" aria-expanded="false">${escapeHtml(ep.overview)}</button>` : ''}
            <button type="button" class="episode-item__upto" data-action="marcarAteAqui" data-season="${ep.season_number}" data-episode="${ep.episode_number}" aria-label="Vi até ${code}: marca este e todos os anteriores">Vi até aqui</button>
        </div>`;
}

// Tocar no cabeçalho esconde ou mostra temporadas, resumo e lista
function setEpisodesOpen(open) {
    document.getElementById('episodes-body').hidden = !open;
    document.getElementById('episodes-toggle').setAttribute('aria-expanded', String(open));
}

async function onSeasonChange(seasonNumber) {
    if (!session.episodes.seriesId) return;
    document.querySelectorAll('#episodes-seasons .season-pill').forEach(pill => {
        pill.setAttribute('aria-pressed', String(Number(pill.dataset.season) === seasonNumber));
    });
    await renderEpisodeList(session.episodes.seriesId, seasonNumber);
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

// Resumo da temporada mostrada: "3/10 assistidos · 7 restantes" (ou "Concluída"), um botão que
// marca a temporada inteira (ou desmarca, se já está toda vista) e, se há algo marcado, "Desmarcar série"
function renderSeasonSummary(seriesId, episodes) {
    const summary = document.getElementById('episodes-summary');
    if (!summary) return;
    const watched = episodes.filter(ep =>
        session.episodes.watchedKeys.has(buildEpisodeKey(seriesId, ep.season_number, ep.episode_number))
    ).length;
    const remaining = episodes.length - watched;
    const status = remaining > 0
        ? `<strong>${remaining} ${pluralize(remaining, 'restante', 'restantes')}</strong>`
        : '<strong class="text-success">Concluída</strong>';
    const toggle = remaining > 0
        ? '<button type="button" class="episodes-bulk-btn" data-action="marcarTemporadaAtual">Marcar temporada como vista</button>'
        : '<button type="button" class="episodes-bulk-btn" data-action="desmarcarTemporadaAtual">Desmarcar temporada</button>';
    const unmarkSeries = session.episodes.watchedKeys.size > 0
        ? '<button type="button" class="episodes-bulk-btn episodes-bulk-btn--link" data-action="desmarcarTodosEpisodios">Desmarcar série</button>'
        : '';
    summary.innerHTML = `<p class="episodes-season-counter">${joinMeta([`${watched}/${episodes.length} assistidos`, status])}</p>
        <div class="episodes-summary__actions">${toggle}${unmarkSeries}</div>`;
}

function updateSeasonCounter(seriesId, seasonNumber) {
    const seasonData = cachedSeason(seriesId, seasonNumber);
    if (seasonData) renderSeasonSummary(seriesId, seasonData.episodes);
}

// Selo "Assistindo"/"Concluído" e o botão "Já vi" da série aberta; só desenha
function renderSeriesStatus(seriesData) {
    const btnV = document.getElementById('btn-visto');
    const badge = document.getElementById('episodes-status-badge');
    if (!seriesData || !btnV) return;

    const total = seriesData.number_of_episodes || 0;
    const watched = session.episodes.watchedKeys.size;
    const isCompleted = total > 0 && watched >= total;
    setSeenButton(btnV, !isRemovingWatched(seriesData.id) && (inHistory(seriesData.id) || isCompleted));

    const seasons = seriesData.number_of_seasons || 0;
    document.getElementById('episodes-overview').textContent = joinMeta([
        seasons && `${seasons} ${pluralize(seasons, 'temporada', 'temporadas')}`,
        total && `${watched}/${total} vistos`,
    ]);

    if (!badge) return;
    badge.hidden = watched === 0;
    badge.textContent = isCompleted ? 'Concluído' : 'Assistindo';
    badge.className = `episodes-status-badge ${isCompleted ? 'status-completed' : 'status-watching'}`;
    renderSeriesProgress(seriesData);
}

// No alto da página: "Próximo: T01E03 · 5 restantes" e a barra (o mesmo cálculo do Continue assistindo).
// Só para série começada e não concluída; tocar leva aos episódios.
async function renderSeriesProgress(seriesData) {
    const box = document.getElementById('m-series-progress');
    if (!box) return;
    const watchedKeys = session.episodes.watchedKeys;
    if (watchedKeys.size === 0 || !seriesData.number_of_seasons) {
        box.hidden = true;
        return;
    }
    let upNext = null;
    try {
        upNext = seriesUpNext(watchedKeys, await getAllSeasons(seriesData.id, seriesData.number_of_seasons), seriesData.id);
    } catch {
        // sem as temporadas não há o que mostrar; a lista de episódios já avisa o erro
    }
    if (state.currentMovie?.id !== seriesData.id) return;
    box.hidden = !upNext;
    if (!upNext) return;
    document.getElementById('m-series-progress-text').textContent =
        joinMeta([`Próximo: ${upNext.nextLabel}`, `${upNext.remaining} ${pluralize(upNext.remaining, 'restante', 'restantes')}`]);
    document.getElementById('m-series-progress-fill').style.width = `${upNext.percent}%`;
}

const CHECK_ICON = ph('check', { weight: 'bold', cls: 'icon icon-16 icon-lead-4' });

// Botão "Já vi" (ativo) ou "Já visto" (desativado), de filmes e séries
// Alterna: marcado, tocar de novo tira de Já assistidos (achado do usuário: ficava travado)
export function setSeenButton(btnV, seen) {
    btnV.innerHTML = CHECK_ICON + (seen ? 'Já visto' : 'Já vi');
    btnV.disabled = false;
    btnV.setAttribute('aria-pressed', String(seen));
    const label = seen ? 'Tirar de Já assistidos' : 'Marcar como assistido';
    btnV.setAttribute('aria-label', label);
    btnV.dataset.tooltip = label;
}

// A série aberta acompanha a Biblioteca (tirou e desfez pelo "Já visto", por exemplo)
on('library:changed', () => {
    if (isSeriesType(state.currentMovie?.media_type)) renderSeriesStatus(state.currentMovie);
});

async function desmarcarTemporadaAtual() {
    if (!canTrackEpisodes() || !state.currentMovie) return;

    const seriesId = state.currentMovie.id;
    const currentSeason = selectedSeason();

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
const markButtons = disabled => document.querySelectorAll('.episodes-bulk-btn').forEach(b => { b.disabled = disabled; });
const selectedSeason = () => Number(document.querySelector('#episodes-seasons [aria-pressed="true"]')?.dataset.season || 1);

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
    if (ok) showToast(`Temporada ${currentSeason} marcada`);
}

// Todas as temporadas (sem a 0, de especiais). Usado pelo "Marcar série" e pelo "Já vi" da série.
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
        escolherTemporada: el => onSeasonChange(Number(el.dataset.season)),
        alternarEpisodios: el => setEpisodesOpen(el.getAttribute('aria-expanded') !== 'true'),
        // A sinopse começa em 2 linhas; tocar abre inteira (e fecha de novo)
        alternarSinopse: el => el.setAttribute('aria-expanded', String(el.getAttribute('aria-expanded') !== 'true')),
    },
    change: {
        toggleEpisode: el => toggleEpisode(Number(el.dataset.series), Number(el.dataset.season), Number(el.dataset.episode), el.checked),
    },
});
