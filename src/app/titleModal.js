// Modal de detalhes do título
import { isAbortError, latestSignal, tmdbGet } from '../api/tmdb.js';
import { PERSON_PLACEHOLDER } from './discover.js';
import { _moveFromWatchlistIfNeeded, loadEpisodesSection, markWholeSeries, setSeriesSeenButton } from './episodes.js';
import { salvarHistorico, toggleWatchlist } from './library.js';
import { renderReactions } from './reactions.js';
import { updateHistoryNav } from './sorteioHistory.js';
import { setUrlTitle } from './urlSync.js';
import { trackChallenge } from './progress.js';
import { session, state } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatRating } from '../utils/format.js';
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

function showSectionLoading(containerId, message) {
    const note = document.createElement('span');
    note.className = 'section-loading';
    note.textContent = message;
    document.getElementById(containerId).replaceChildren(note);
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

async function loadProviders(f, type, signal) {
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
            provDiv.innerHTML = '<span class="text-tertiary text-small">Indisponível em streaming</span>';
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

    document.getElementById('m-title').innerText = f.title || f.name;
    document.getElementById('m-desc').innerText = f.overview || "Sem sinopse.";

    // Links de crítica: RT por busca no título; IMDb só se houver imdb_id (séries precisam de external_ids)
    const linkImdb = document.getElementById('link-imdb');
    const linkRt = document.getElementById('link-rt');
    linkRt.href = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(f.original_title || f.original_name || f.title || f.name)}`;
    linkImdb.hidden = true;
    document.getElementById('m-rating').innerHTML = `<svg aria-hidden="true" class="icon icon-14 icon-lead-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>${formatRating(f.vote_average)}`;
    document.getElementById('m-year').innerText = (f.release_date || f.first_air_date || '').split('-')[0];
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
        btnV.innerHTML = vistos.find(i=>i.id===f.id) ? '<svg aria-hidden="true" class="icon icon-16 icon-lead-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>JÁ VISTO' : '<svg aria-hidden="true" class="icon icon-16 icon-lead-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>Já Vi';
        btnV.disabled = !!vistos.find(i=>i.id===f.id);
    }

    const starIcon = '<svg aria-hidden="true" class="icon icon-16 icon-lead-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
    const removeIcon = '<svg aria-hidden="true" class="icon icon-16 icon-lead-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const inWatchlist = !!(session.user.watchlist || []).find(i => i.id === f.id);
    const watchlistLabel = isSeries ? 'Quero Assistir' : 'Salvar';
    btnS.innerHTML = inWatchlist ? `${removeIcon}Remover da Lista` : `${starIcon}${watchlistLabel}`;

    renderReactions();

    // Atualizar navegação do histórico de sorteios
    updateHistoryNav();

    // Carregar seção de episódios (TV/Dorama only — T001-009)
    loadEpisodesSection(f);

    document.getElementById('modal-resultado').style.display = 'flex';

    await Promise.all([
        loadImdbLink(f, type, signal),
        loadCast(f, type, signal),
        loadTrailer(f, type, signal),
        loadProviders(f, type, signal),
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
    btnV.innerHTML = '<svg aria-hidden="true" class="icon icon-16 icon-lead-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>JÁ VISTO';
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

