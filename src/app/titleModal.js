// Modal de detalhes do título
import { isAbortError, latestSignal, tmdbGet } from '../api/tmdb.js';
import { ph } from '../ui/phosphor.js';
import { PERSON_PLACEHOLDER } from './discover.js';
import { _moveFromWatchlistIfNeeded, loadEpisodesSection, markWholeSeries, setSeriesSeenButton } from './episodes.js';
import { salvarHistorico, toggleWatchlist } from './library.js';
import { renderReactions } from './reactions.js';
import { hideRouletteNote, updateRouletteButton } from './roulette.js';
import { updateSaveListButton } from './userLists.js';
import { updateHistoryNav } from './sorteioHistory.js';
import { setUrlTitle } from './urlSync.js';
import { trackChallenge } from './progress.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { titleFacts, titleSize } from '../domain/titleFacts.js';
import { cinemaLabel, cinemaStatus, localDay } from '../domain/cinemaRelease.js';
import { IMG_URL } from '../config/constants.js';

// ================================================
// EPISÓDIOS — abre modal de tracking (T001-009)
// ================================================


export async function abrirEpisodios(seriesId, mediaType) {
    await carregarDetalhes(seriesId, mediaType);
    // Rolar até a seção de episódios após o modal abrir
    setTimeout(() => {
        const section = document.getElementById('episodes-section');
        if (section && !section.hidden) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 300);
}

// MODAL

export async function carregarDetalhes(id, type) {
    const endpoint = type === 'dorama' ? 'tv' : type;
    try {
        // Dois cliques seguidos: vale o último, mesmo que a resposta do primeiro chegue depois
        const data = await tmdbGet(`/${endpoint}/${id}`, {}, { signal: latestSignal('details') });
        // cópia: a resposta fica no cache. Dorama continua dorama (vai para o grupo certo em "Já assistidos")
        const f = { ...data, media_type: type === 'dorama' ? 'dorama' : endpoint };
        await abrirModal(f);
    } catch(e) {
        if (isAbortError(e)) return;
        console.error('Erro ao carregar título:', e);
        showToast('Não foi possível abrir este título. Verifique a conexão e tente de novo.', 'error');
    }
}

// Substitui o conteúdo de uma seção do modal por um aviso (evita mostrar dados do título anterior)

export function showSectionError(containerId, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const note = document.createElement('span');
    note.className = 'section-error';
    note.textContent = message;
    container.replaceChildren(note);
}

// Carregando: blocos no formato do que vai chegar (o texto fica para o leitor de tela)
const SKELETON = { 'cast-list': 'cast', 'm-providers': 'provider', 'm-similar': 'poster' };
function showSectionLoading(containerId, message) {
    const note = document.createElement('span');
    note.className = 'section-loading sr-only';
    note.textContent = message;
    const shape = SKELETON[containerId];
    const blocks = Array.from({ length: shape === 'provider' ? 3 : 4 }, () => {
        const b = document.createElement('span');
        b.className = `skeleton skeleton--${shape}`;
        b.setAttribute('aria-hidden', 'true');
        return b;
    });
    document.getElementById(containerId).replaceChildren(note, ...blocks);
}

async function loadImdbLink(f, type, signal) {
    const linkImdb = document.getElementById('link-imdb');
    try {
        let imdbId = f.imdb_id;
        if (!imdbId) {
            imdbId = (await tmdbGet(`/${type}/${f.id}/external_ids`, { language: null }, { signal })).imdb_id;
        }
        if (imdbId && !signal.aborted) {
            linkImdb.href = `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;
            linkImdb.hidden = false;
        }
    } catch (e) {
        if (!isAbortError(e)) console.error('Erro ao buscar IMDb ID:', e);
    }
}

// Linha única de informações: aparece na hora com o que o título já traz; a duração
// (ou as temporadas) chega depois, com os detalhes do TMDB
const STAR = ph('star', { weight: 'fill', cls: 'icon icon-14' });
const CHECK_ICON = ph('check', { weight: 'bold', cls: 'icon icon-16 icon-lead-4' });
function renderFacts(f, type, details = {}) {
    const isTv = type === 'tv';
    const facts = titleFacts({
        rating: f.vote_average,
        date: f.release_date || f.first_air_date,
        runtime: details.runtime,
        seasons: isTv ? details.number_of_seasons : undefined,
        genres: f.genre_ids?.length ? f.genre_ids : (details.genres || f.genres),
    });
    // Nota, ano e duração numa linha; os gêneros na linha de baixo (assim nenhum "•" fica sobrando ao quebrar)
    const main = facts.filter(fact => fact.kind !== 'genres').map(fact => fact.kind === 'rating'
        ? `<span class="rating"><span class="sr-only">Nota </span>${STAR}${escapeHtml(fact.text)}</span>`
        : `<span>${escapeHtml(fact.text)}</span>`).join('<span class="modal-info__dot" aria-hidden="true">•</span>');
    const genres = facts.find(fact => fact.kind === 'genres');
    document.getElementById('m-facts').innerHTML = main + (genres ? `<span class="modal-info__genres">${escapeHtml(genres.text)}</span>` : '');
}

// Detalhes do TMDB, pedidos uma vez por título; filmes trazem junto as datas de lançamento (cinema)
function fetchDetails(f, type, signal) {
    const params = type === 'movie' ? { append_to_response: 'release_dates' } : {};
    return tmdbGet(`/${type}/${f.id}`, params, { signal });
}

async function loadFacts(f, type, signal, detailsPromise) {
    try {
        const details = await detailsPromise;
        if (signal.aborted || state.currentMovie?.id !== f.id) return;
        renderFacts(f, type, details);
    } catch (e) {
        if (!isAbortError(e)) console.error('Erro ao carregar detalhes:', e);
    }
}

// "Parecidos": recomendações do TMDB; sem nenhuma, a aba e a seção somem
async function loadSimilar(f, type, mediaType, signal) {
    const section = document.getElementById('sec-parecidos');
    const tab = document.getElementById('tab-parecidos');
    section.hidden = false;
    tab.hidden = false;
    showSectionLoading('m-similar', 'Carregando parecidos...');
    try {
        const data = await tmdbGet(`/${type}/${f.id}/recommendations`, {}, { signal });
        if (signal.aborted || state.currentMovie?.id !== f.id) return;
        const items = (data.results || []).filter(i => i.poster_path).slice(0, 10);
        section.hidden = tab.hidden = items.length === 0;
        document.getElementById('m-similar').innerHTML = items.map(i => {
            const name = i.title || i.name;
            return `<button type="button" class="similar-item" data-action="carregarDetalhes" data-id="${i.id}" data-media="${mediaType}" aria-label="${escapeHtml(name)}">
                <img src="${IMG_URL + i.poster_path}" alt="" width="500" height="750" loading="lazy">
                <span class="similar-item__name" aria-hidden="true">${escapeHtml(name)}</span></button>`;
        }).join('');
    } catch (e) {
        if (isAbortError(e)) return;
        section.hidden = tab.hidden = true;
    }
}

// Abas da página do título: levam até a parte e marcam a que está na tela
const scroller = () => document.getElementById('modal-resultado');
// Depois de tocar numa aba, ela fica marcada até a rolagem parar (a marcação automática não a desfaz no caminho)
let tabLockUntil = 0;
export function goTitleSection(id) {
    const target = document.getElementById(id);
    if (!target || target.hidden) return;
    const nav = document.querySelector('.title-tabs');
    const top = target.getBoundingClientRect().top - scroller().getBoundingClientRect().top + scroller().scrollTop - (nav?.offsetHeight || 0) - 8;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scroller().scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    tabLockUntil = performance.now() + 1000;
    setActiveTab(id);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
}

function setActiveTab(id) {
    document.querySelectorAll('.title-tab').forEach(tab => {
        const on = tab.dataset.arg === id;
        tab.classList.toggle('is-active', on);
        if (on) tab.setAttribute('aria-current', 'true'); else tab.removeAttribute('aria-current');
    });
}

let tabsReady = false;
function initTitleTabs() {
    if (tabsReady) return;
    tabsReady = true;
    // Episódios: a aba aparece junto com a seção (só séries e doramas)
    const episodes = document.getElementById('episodes-section');
    const sync = () => { document.getElementById('tab-episodios').hidden = episodes.hidden; };
    new MutationObserver(sync).observe(episodes, { attributes: true, attributeFilter: ['hidden'] });
    sync();
    // Marca a aba da parte que está no alto da tela enquanto a pessoa rola
    let ticking = false;
    scroller().addEventListener('scroll', () => {
        if (ticking) return;
        if (performance.now() < tabLockUntil) { tabLockUntil = performance.now() + 150; return; }
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            const line = scroller().getBoundingClientRect().top + (document.querySelector('.title-tabs')?.offsetHeight || 0) + 24;
            let current = 'sec-sobre';
            document.querySelectorAll('.title-tab').forEach(tab => {
                const sec = document.getElementById(tab.dataset.arg);
                if (sec && !sec.hidden && !tab.hidden && sec.getBoundingClientRect().top <= line) current = tab.dataset.arg;
            });
            setActiveTab(current);
        });
    }, { passive: true });
}

// Cada seção carrega por conta própria: o modal já está aberto e uma falha não afeta as outras
async function loadCast(f, type, signal) {
    try {
        const cData = await tmdbGet(`/${type}/${f.id}/credits`, {}, { signal });
        if (signal.aborted) return; // resposta do cache não passa pelo abort
        const castDiv = document.getElementById('cast-list');
        castDiv.innerHTML = '';
        cData.cast.slice(0,8).forEach(a => {
            castDiv.innerHTML += `<div class="cast-item"><img src="${a.profile_path ? IMG_URL+a.profile_path : PERSON_PLACEHOLDER}" class="cast-photo" alt="" width="60" height="60" loading="lazy"><br>${escapeHtml(a.name)}</div>`;
        });
    } catch(e) {
        if (isAbortError(e)) return;
        console.error('Erro ao carregar elenco:', e);
        showSectionError('cast-list', 'Não foi possível carregar o elenco.');
    }
}

async function loadTrailer(f, type, signal) {
    try {
        let vData = await tmdbGet(`/${type}/${f.id}/videos`, {}, { signal });
        if (signal.aborted) return;
        if(vData.results.length === 0) {
            vData = await tmdbGet(`/${type}/${f.id}/videos`, { language: 'en-US' }, { signal });
        }
        if (signal.aborted) return;
        const trailer = vData.results.find(v => v.site === 'YouTube');
        const vidArea = document.getElementById('video-area');
        if(trailer) {
            vidArea.style.display = 'block';
            document.getElementById('trailer-frame').src = `https://www.youtube-nocookie.com/embed/${trailer.key}`;
        } else {
            vidArea.style.display = 'none';
        }
    } catch(e) {
        if (isAbortError(e)) return;
        // Sem trailer é um estado normal: só esconde a área, sem aviso
        console.error('Erro ao carregar trailer:', e);
        document.getElementById('video-area').style.display = 'none';
        document.getElementById('trailer-frame').src = '';
    }
}

// Sem streaming: filme em cartaz no Brasil ou com estreia marcada ganha o aviso no lugar de "Indisponível"
const CINEMA_ICON = ph('popcorn', { weight: 'duotone', cls: 'icon icon-20' });
async function cinemaNote(type, detailsPromise) {
    if (type !== 'movie') return '';
    try {
        const today = localDay();
        return cinemaLabel(cinemaStatus((await detailsPromise)?.release_dates, today), today);
    } catch {
        return ''; // sem as datas, fica o aviso de sempre
    }
}

async function loadProviders(f, type, signal, detailsPromise) {
    try {
        const pData = await tmdbGet(`/${type}/${f.id}/watch/providers`, { language: null }, { signal });
        if (signal.aborted) return; // resposta do cache não passa pelo abort
        const provDiv = document.getElementById('m-providers');
        provDiv.innerHTML = '';
        if(pData.results?.BR?.flatrate) {
            const link = pData.results.BR.link;
            pData.results.BR.flatrate.forEach(p => {
                provDiv.innerHTML += `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" aria-label="Ver no ${escapeHtml(p.provider_name)} (abre em nova aba)"><img src="${IMG_URL+p.logo_path}" class="provider-logo" alt="" width="44" height="44" loading="lazy" title="Ver no ${escapeHtml(p.provider_name)}"></a>`;
            });
        } else {
            const note = await cinemaNote(type, detailsPromise);
            if (signal.aborted) return;
            provDiv.innerHTML = note
                ? `<span class="cinema-note">${CINEMA_ICON}${escapeHtml(note)}</span>`
                : '<span class="text-tertiary text-small">Indisponível em streaming</span>';
        }
    } catch(e) {
        if (isAbortError(e)) return;
        console.error('Erro ao carregar plataformas:', e);
        showSectionError('m-providers', 'Não foi possível verificar onde assistir.');
    }
}

export async function abrirModal(f, { fromDraw = false } = {}) {
    state.currentMovie = f;
    trackChallenge('opened', f);
    const signal = latestSignal('title');
    setUrlTitle({ type: f.media_type === 'dorama' ? 'dorama' : (f.media_type || state.type), id: f.id });
    const mediaType = f.media_type || state.type;
    const type = mediaType === 'dorama' ? 'tv' : mediaType;

    const titleEl = document.getElementById('m-title');
    titleEl.innerText = f.title || f.name;
    titleEl.dataset.size = titleSize(f.title || f.name);
    document.getElementById('m-desc').innerText = f.overview || "Sem sinopse.";

    // Links de crítica: RT por busca no título; IMDb só se houver imdb_id (séries precisam de external_ids)
    const linkImdb = document.getElementById('link-imdb');
    const linkRt = document.getElementById('link-rt');
    linkRt.href = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(f.original_title || f.original_name || f.title || f.name)}`;
    linkImdb.hidden = true;
    renderFacts(f, type);
    const ambient = document.getElementById('m-ambient');
    ambient.style.backgroundImage = f.poster_path ? `url("${IMG_URL + f.poster_path}")` : (f.backdrop_path ? `url("${IMG_URL + f.backdrop_path}")` : 'none');
    document.getElementById('m-poster').src = f.backdrop_path ? IMG_URL + f.backdrop_path : (f.poster_path ? IMG_URL + f.poster_path : '');

    // Mostra "Sortear outro" só para o que veio de um sorteio
    document.getElementById('btn-sortear-outro').hidden = !fromDraw;

    // Limpa o título anterior antes de abrir: as seções abaixo chegam depois
    document.getElementById('video-area').style.display = 'none';
    document.getElementById('trailer-frame').src = '';
    showSectionLoading('cast-list', 'Carregando elenco...');
    showSectionLoading('m-providers', 'Verificando onde assistir...');

    // Botões
    const vistos = session.user.history || [];

    const btnV = document.getElementById('btn-visto');
    const btnS = document.getElementById('btn-salvar');

    const isSeries = (f.media_type === 'tv' || f.media_type === 'dorama' || state.type === 'tv' || state.type === 'dorama');

    if (isSeries) {
        // Séries também têm "Já Vi"; ao terminar todos os episódios, a série é marcada sozinha
        setSeriesSeenButton(btnV, !!vistos.find(i => i.id === f.id));
    } else {
        btnV.innerHTML = vistos.find(i=>i.id===f.id) ? CHECK_ICON + 'JÁ VISTO' : CHECK_ICON + 'Já Vi';
        btnV.disabled = !!vistos.find(i=>i.id===f.id);
    }

    const starIcon = ph('bookmark-simple', { weight: 'bold', cls: 'icon icon-16 icon-lead-4' });
    const removeIcon = ph('bookmark-simple', { weight: 'fill', cls: 'icon icon-16 icon-lead-4' });
    const inWatchlist = !!(session.user.watchlist || []).find(i => i.id === f.id);
    const watchlistLabel = isSeries ? 'Quero Assistir' : 'Salvar';
    btnS.innerHTML = inWatchlist ? `${removeIcon}Remover da Lista` : `${starIcon}${watchlistLabel}`;
    btnS.classList.toggle('is-on', inWatchlist);

    renderReactions();
    updateSaveListButton();
    updateRouletteButton();
    hideRouletteNote();

    // Atualizar navegação do histórico de sorteios
    updateHistoryNav();

    // Carregar seção de episódios (TV/Dorama only — T001-009)
    loadEpisodesSection(f);

    initTitleTabs();
    setActiveTab('sec-sobre');
    document.getElementById('modal-resultado').style.display = 'flex';
    scroller().scrollTop = 0;

    const detailsPromise = fetchDetails(f, type, signal);
    detailsPromise.catch(() => {}); // o erro é tratado por quem espera (fatos e onde assistir)
    await Promise.all([
        loadImdbLink(f, type, signal),
        loadFacts(f, type, signal, detailsPromise),
        loadSimilar(f, type, mediaType, signal),
        loadCast(f, type, signal),
        loadTrailer(f, type, signal),
        loadProviders(f, type, signal, detailsPromise),
    ]);
}

// Fica aberto: o botão vira "JÁ VISTO" e aparece o "Como foi?", com o foco na primeira reação
export async function marcarVistoAtual() {
    const movie = state.currentMovie;
    if (!movie) return;
    const isSeries = movie.media_type === 'tv' || movie.media_type === 'dorama';
    const btnV = document.getElementById('btn-visto');
    if (isSeries) btnV.disabled = true; // marcar a série inteira leva um instante: evita o segundo toque
    await salvarHistorico(movie);
    if (!(session.user.history || []).some(h => h.id === movie.id)) {
        if (isSeries && state.currentMovie === movie) btnV.disabled = false;
        return;
    }
    if (isSeries) {
        // "Já Vi" numa série marca todas as temporadas e sai do "Quero Assistir"
        await markWholeSeries(movie);
        await _moveFromWatchlistIfNeeded(movie.id);
    }
    if (state.currentMovie !== movie) return;
    btnV.innerHTML = CHECK_ICON + 'JÁ VISTO';
    btnV.disabled = true;
    renderReactions();
    if (document.getElementById('modal-resultado').style.display !== 'none') {
        document.querySelector('#m-reactions [data-action="reactTitle"]')?.focus();
    }
}

export async function toggleSalvarAtual() {
    await toggleWatchlist(state.currentMovie);
    fecharModal();
}

export function fecharModal() {
    document.getElementById('modal-resultado').style.display = 'none';
    document.getElementById('trailer-frame').src = "";
    latestSignal('title'); // cancela o que ainda estava carregando
    setUrlTitle(null);
    // Limpar estado de episódios
    session.episodes = { seriesId: null, watchedKeys: new Set(), seasonData: {} };
}

// COMPARTILHAR

