// Modal de detalhes do título
import { isAbortError, latestSignal, titleDetails, tmdbGet } from '../api/tmdb.js';
import { ph } from '../ui/phosphor.js';
import { markWholeSeries, setSeenButton } from './episodes.js';
import { salvarHistorico, toggleWatchlist } from './library.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { titleFacts, titleSize } from '../domain/titleFacts.js';
import { cinemaLabel, cinemaStatus } from '../domain/cinemaRelease.js';
import { watchProviders } from '../domain/providers.js';
import { rankTrailers } from '../domain/trailers.js';
import { firstAvailableVideo } from '../api/youtube.js';
import { localDay } from '../utils/date.js';
import { IMG_URL } from '../config/constants.js';
import { getTmdbEndpoint, getTitle, isSeriesType } from '../domain/mediaItem.js';
import { emit } from '../state/events.js';
import { closeModal, isModalOpen, onModalClose, openModal } from '../ui/modals.js';
import { personPhoto, posterImg } from '../ui/icons.js';
import { registerActions } from '../ui/actions.js';
import { afterAnimations, prefersReducedMotion } from '../ui/motion.js';

// ================================================
// EPISÓDIOS — abre modal de tracking (T001-009)
// ================================================


async function abrirEpisodios(seriesId, mediaType) {
    await carregarDetalhes(seriesId, mediaType); // já com a seção de episódios carregada
    await afterAnimations(document.getElementById('modal-resultado')); // a janela parou de entrar
    const section = document.getElementById('episodes-section');
    if (section && !section.hidden) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// MODAL

export async function carregarDetalhes(id, type) {
    const endpoint = getTmdbEndpoint(type);
    try {
        // Dois cliques seguidos: vale o último, mesmo que a resposta do primeiro chegue depois
        const data = await titleDetails(type, id, { signal: latestSignal('details') });
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

function showSectionError(containerId, message) {
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
    showSectionLoading('m-similar', 'Carregando parecidos…');
    try {
        const data = await tmdbGet(`/${type}/${f.id}/recommendations`, {}, { signal });
        if (signal.aborted || state.currentMovie?.id !== f.id) return;
        const items = (data.results || []).filter(i => i.poster_path).slice(0, 10);
        section.hidden = tab.hidden = items.length === 0;
        document.getElementById('m-similar').innerHTML = items.map(i => {
            const name = getTitle(i);
            return `<button type="button" class="similar-item" data-action="carregarDetalhes" data-id="${i.id}" data-media="${mediaType}" aria-label="${escapeHtml(name)}">
                ${posterImg(i.poster_path)}
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
function goTitleSection(id) {
    const target = document.getElementById(id);
    if (!target || target.hidden) return;
    const nav = document.querySelector('.title-tabs');
    const top = target.getBoundingClientRect().top - scroller().getBoundingClientRect().top + scroller().scrollTop - (nav?.offsetHeight || 0) - 8;
    const reduce = prefersReducedMotion();
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
            castDiv.innerHTML += `<div class="cast-item"><img src="${personPhoto(a.profile_path)}" class="cast-photo" alt="" width="60" height="60" loading="lazy"><br>${escapeHtml(a.name)}</div>`;
        });
    } catch(e) {
        if (isAbortError(e)) return;
        console.error('Erro ao carregar elenco:', e);
        showSectionError('cast-list', 'Não foi possível carregar o elenco.');
    }
}

async function loadTrailer(f, type, signal) {
    try {
        // Dublado/legendado primeiro; o em inglês entra quando nenhum em português existe mais
        let key = null;
        for (const params of [{}, { language: 'en-US' }]) {
            const vData = await tmdbGet(`/${type}/${f.id}/videos`, params, { signal });
            if (signal.aborted) return;
            key = await firstAvailableVideo(rankTrailers(vData.results));
            if (signal.aborted) return;
            if (key) break;
        }
        const vidArea = document.getElementById('video-area');
        if(key) {
            vidArea.style.display = 'block';
            document.getElementById('trailer-frame').src = `https://www.youtube-nocookie.com/embed/${key}`;
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
            watchProviders(pData.results.BR.flatrate).forEach(p => {
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

export async function abrirModal(item, { fromDraw = false } = {}) {
    // O tipo fica no próprio título aberto: quem o lê depois (histórico, episódios, listas) não adivinha
    const mediaType = item.media_type || state.type;
    const f = { ...item, media_type: mediaType };
    state.currentMovie = f;
    const signal = latestSignal('title');
    const type = getTmdbEndpoint(mediaType);

    const titleEl = document.getElementById('m-title');
    titleEl.innerText = getTitle(f);
    titleEl.dataset.size = titleSize(getTitle(f));
    document.getElementById('m-desc').innerText = f.overview || "Sem sinopse.";

    // Links de crítica: RT por busca no título; IMDb só se houver imdb_id (séries precisam de external_ids)
    const linkImdb = document.getElementById('link-imdb');
    const linkRt = document.getElementById('link-rt');
    linkRt.href = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(f.original_title || f.original_name || getTitle(f))}`;
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
    showSectionLoading('cast-list', 'Carregando elenco…');
    showSectionLoading('m-providers', 'Verificando onde assistir…');

    const vistos = session.user.history || [];

    const btnV = document.getElementById('btn-visto');
    const btnS = document.getElementById('btn-salvar');

    const isSeries = type === 'tv';

    // Séries também: ao terminar todos os episódios, a série é marcada sozinha (episodes.js)
    setSeenButton(btnV, vistos.some(i => i.id === f.id));

    const starIcon = ph('bookmark-simple', { weight: 'bold', cls: 'icon icon-16 icon-lead-4' });
    const removeIcon = ph('bookmark-simple', { weight: 'fill', cls: 'icon icon-16 icon-lead-4' });
    const inWatchlist = !!(session.user.watchlist || []).find(i => i.id === f.id);
    const watchlistLabel = isSeries ? 'Quero Assistir' : 'Salvar';
    btnS.innerHTML = inWatchlist ? `${removeIcon}Remover da Lista` : `${starIcon}${watchlistLabel}`;
    btnS.classList.toggle('is-on', inWatchlist);

    // Reações, listas, roleta, histórico de sorteios, episódios, URL e desafios acompanham o título aberto
    const opened = emit('title:opened', { item: f, mediaType });

    initTitleTabs();
    setActiveTab('sec-sobre');
    openModal('modal-resultado');
    scroller().scrollTop = 0;

    const detailsPromise = titleDetails(mediaType, f.id, { signal });
    detailsPromise.catch(() => {}); // o erro é tratado por quem espera (fatos e onde assistir)
    await Promise.all([
        opened,
        loadImdbLink(f, type, signal),
        loadFacts(f, type, signal, detailsPromise),
        loadSimilar(f, type, mediaType, signal),
        loadCast(f, type, signal),
        loadTrailer(f, type, signal),
        loadProviders(f, type, signal, detailsPromise),
    ]);
}

// Fica aberto: o botão vira "Já visto" e aparece o "Como foi?", com o foco na primeira reação
async function marcarVistoAtual() {
    const movie = state.currentMovie;
    if (!movie) return;
    const isSeries = isSeriesType(movie.media_type);
    const btnV = document.getElementById('btn-visto');
    if (isSeries) btnV.disabled = true; // marcar a série inteira leva um instante: evita o segundo toque
    await salvarHistorico(movie);
    if (!(session.user.history || []).some(h => h.id === movie.id)) {
        if (isSeries && state.currentMovie === movie) btnV.disabled = false;
        return;
    }
    // "Já vi" numa série marca todas as temporadas (e assim sai do "Quero Assistir")
    // (markWholeSeries já avisa a biblioteca; sem temporadas para marcar, avisa aqui)
    if (!(isSeries && await markWholeSeries(movie))) await emit('library:changed');
    if (state.currentMovie !== movie) return;
    setSeenButton(btnV, true);
    if (isModalOpen('modal-resultado')) {
        document.querySelector('#m-reactions [data-action="reactTitle"]')?.focus();
    }
}

async function toggleSalvarAtual() {
    await toggleWatchlist(state.currentMovie);
    fecharModal();
}

// Fechar pela pessoa (Esc, tocar fora, "Fechar", arrastar) também para o trailer e o carregamento
onModalClose('modal-resultado', fecharModal);

export function fecharModal() {
    closeModal('modal-resultado');
    document.getElementById('trailer-frame').src = "";
    latestSignal('title'); // cancela o que ainda estava carregando
    emit('title:closed');
}

// COMPARTILHAR

registerActions({
    click: {
        abrirEpisodios: el => abrirEpisodios(Number(el.dataset.id), el.dataset.media),
        carregarDetalhes: el => carregarDetalhes(Number(el.dataset.id), el.dataset.media),
        goTitleSection: el => goTitleSection(el.dataset.arg),
        marcarVistoAtual,
        toggleSalvarAtual,
    },
});
