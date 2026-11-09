// Biblioteca: Quero Assistir, Em Andamento, Já Assistidos e Minhas Listas (src/app/userLists.js)
import { supabaseAddToHistory, supabaseAddToWatchlist, supabaseGetWatchlist, supabaseRemoveFromHistory, supabaseRemoveFromWatchlist } from '../api/supabase.js';
import { ph } from '../ui/phosphor.js';
import { clearSeries, getAllSeriesInProgress } from './episodeStore.js';
import { tmdbGet } from '../api/tmdb.js';
import { fetchAllSeasonsLocal } from './episodes.js';
import { saveGuestHistory, saveGuestWatchlist } from './guestLibrary.js';
import { checkAllBadges } from './profile.js';
import { grantXp, trackChallenge } from './progress.js';
import { renderReactions } from './reactions.js';
import { renderListsTab, updateSaveListButton } from './userLists.js';
import { renderContinueRow } from './homeRows.js';
import { reactionOf } from '../domain/reactions.js';
import { calcProgressPercent, getNextEpisode } from '../domain/seriesProgress.js';
import { session, state } from '../state/appState.js';
import { pendingRemovals, scheduleUndoable, showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { pluralize } from '../utils/format.js';
import { IMG_URL } from '../config/constants.js';
import { CLOSE_ICON } from '../ui/icons.js';
import { TV_ICON } from '../ui/icons.js';

// DADOS

const isGuest = () => session.currentUser === 'guest';

// Só adiciona (nunca tira) e devolve quantos entraram. Usado pela lista do Match.
export async function addManyToWatchlist(titles) {
    if (!session.currentUser) return 0;
    const known = new Set((session.user.watchlist || []).map(i => i.id));
    const fresh = titles.filter(t => !known.has(t.id))
        .map(t => ({ id: t.id, poster: t.poster_path, title: t.title || t.name, type: t.media_type || state.type }));
    if (fresh.length === 0) return 0;

    if (isGuest()) {
        session.user.watchlist = [...(session.user.watchlist || []), ...fresh];
        saveGuestWatchlist(session.user.watchlist);
        renderLibrary();
        return fresh.length;
    }

    let added = 0;
    for (const item of fresh) {
        const result = await supabaseAddToWatchlist(session.currentUserId, item);
        if (result.success) {
            session.user.watchlist = [...(session.user.watchlist || []), item];
            added++;
        }
    }
    renderLibrary();
    return added;
}

export async function salvarHistorico(f) {
    if (!session.currentUser) return;

    if (session.user.history.find(h => h.id === f.id)) return;

    const entry = {
        id: f.id,
        title: f.title || f.name,
        poster: f.poster_path,
        type: f.media_type || state.type,
        year: (f.release_date || f.first_air_date || '').split('-')[0],
        genres: f.genres ? f.genres.map(g => g.id) : f.genre_ids,
        watchedAt: new Date().toISOString() // o Supabase grava o próprio watched_at; este é só para o estado local
    };

    // Convidado guarda no aparelho; conta, no Supabase
    const result = isGuest() ? { success: true } : await supabaseAddToHistory(session.currentUserId, entry);

    if (result.success) {
        session.user.history.push(entry);
        if (isGuest()) saveGuestHistory(session.user.history);
        showToast("Marcado como visto!");
        await renderLibrary();
        grantXp('watched');
        trackChallenge('watched', entry);
        await checkAllBadges();
    } else {
        showToast("Erro ao salvar!", "error");
    }
}

export async function toggleWatchlist(f) {
    if (!session.currentUser) return;

    if (isGuest()) {
        const list = session.user.watchlist || [];
        const exists = list.some(i => i.id === f.id);
        session.user.watchlist = exists
            ? list.filter(i => i.id !== f.id)
            : [...list, { id: f.id, poster: f.poster_path, title: f.title || f.name, type: f.media_type || state.type }];
        saveGuestWatchlist(session.user.watchlist);
        showToast(exists ? "Removido da lista!" : "Adicionado a Quero Assistir!");
        if (!exists) trackChallenge('saved', f);
        renderLibrary();
        return;
    }

    // Carregar watchlist atual do Supabase
    const wlResult = await supabaseGetWatchlist(session.currentUserId);
    const wl = wlResult.success ? wlResult.watchlist : [];

    const exists = wl.find(i => i.id === f.id);

    if (exists) {
        const result = await supabaseRemoveFromWatchlist(session.currentUserId, f.id);
        if (result.success) {
            session.user.watchlist = (session.user.watchlist || []).filter(i => i.id !== f.id);
            showToast("Removido da lista!");
        }
    } else {
        const item = {
            id: f.id,
            poster: f.poster_path,
            title: f.title || f.name,
            type: f.media_type || state.type
        };
        const result = await supabaseAddToWatchlist(session.currentUserId, item);
        if (result.success) {
            session.user.watchlist = [...(session.user.watchlist || []), item];
            showToast("Adicionado a Quero Assistir!");
            trackChallenge('saved', f);
        }
    }

    renderLibrary();
}

// Cada chamada ganha um número: se outra começou enquanto esta esperava o banco, esta desiste
// (senão a resposta atrasada de uma aba antiga desenha por cima da aba atual)
let renderSeq = 0;

export async function renderLibrary() {
    if (!session.currentUser) return;
    const seq = ++renderSeq;
    // O histórico mudou (marcou, desmarcou, terminou a série): o "Como foi?" do título aberto acompanha
    renderReactions();
    updateSaveListButton();
    renderContinueRow(); // "Continue assistindo" do Início acompanha a biblioteca

    const div = document.getElementById('library-content');

    if (state.tab === 'listas') {
        renderListsTab(div);
        return;
    }

    // Aba Em Andamento
    if (state.tab === 'andando') {
        await renderAndando(div, () => seq !== renderSeq);
        return;
    }

    let list;
    if (state.tab === 'watchlist') {
        if (isGuest()) {
            list = session.user.watchlist || [];
        } else {
            const result = await supabaseGetWatchlist(session.currentUserId);
            if (seq !== renderSeq) return;
            list = result.success ? result.watchlist : [];
        }
    } else {
        list = session.user.history || [];
    }
    const listKey = state.tab === 'watchlist' ? 'watchlist_obj' : 'vistos_obj';
    list = list.filter(i => !pendingRemovals.has(`${listKey}:${i.id}`));

    if (list.length === 0) {
        const isWatchlist = state.tab === 'watchlist';
        const starIcon = ph('bookmark-simple', { weight: 'duotone' });
        const checkIcon = ph('check-circle', { weight: 'duotone' });
        const tvIcon = ph('eye', { weight: 'regular' });
        const bookmarkBtn = ph('bookmark-simple', { weight: 'regular' });
        div.innerHTML = `
            <div class="empty-state grid-full">
                <div class="empty-state-icon">${isWatchlist ? starIcon : checkIcon}</div>
                <h3 class="empty-state-title">${isWatchlist ? 'Sua lista está vazia' : 'Nenhum item assistido ainda'}</h3>
                <p class="empty-state-desc">${isWatchlist ? 'Comece adicionando filmes e séries que deseja assistir!' : 'Marque filmes como assistidos para construir seu histórico'}</p>
                <button class="empty-state-cta" data-action="switchTabAndTop" data-arg="${isWatchlist ? 'vistos' : 'watchlist'}">
                    ${isWatchlist ? tvIcon : bookmarkBtn} ${isWatchlist ? 'Ver Assistidos' : 'Ver Lista'}
                </button>
            </div>
        `;
        return;
    }

    const key = state.tab === 'watchlist' ? 'watchlist_obj' : 'vistos_obj';
    div.innerHTML = [
        libraryGroup('FILMES', list.filter(i => i.type === 'movie' || !i.type), 'movie', key),
        libraryGroup('SÉRIES', list.filter(i => i.type === 'tv'), 'tv', key),
        libraryGroup('DORAMAS', list.filter(i => i.type === 'dorama'), 'dorama', key),
    ].join('');
}

function libraryGroup(title, items, media, key) {
    if (items.length === 0) return '';
    const cards = items.map(f => {
        const reaction = key === 'vistos_obj' ? reactionOf(f.reaction) : null;
        const name = escapeHtml(f.title || 'Abrir título') + (reaction ? ` · ${reaction.label}` : '');
        const badge = reaction ? `<span class="title-reaction" aria-hidden="true">${reaction.emoji}</span>` : '';
        return `<div class="library-item"><button type="button" class="library-item__open" data-action="carregarDetalhes" data-id="${f.id}" data-media="${media}" aria-label="${name}"><img src="${IMG_URL + f.poster}" alt="" width="500" height="750" loading="lazy">${badge}</button><button type="button" class="remove-btn" data-action="removeLibItem" data-key="${key}" data-id="${f.id}" aria-label="Remover ${escapeHtml(f.title || 'título')}">${CLOSE_ICON}</button></div>`;
    });
    return `<div class="library-group-title">${title} (${items.length})</div>${cards.join('')}`;
}

// Séries com episódios marcados e ainda sem terminar, com o próximo episódio e o progresso.
// Usado por "Em Andamento" (Biblioteca) e por "Continue assistindo" (Início).
// started: quantas tinham episódios marcados (antes de tirar as terminadas); null se o banco falhou.
export async function loadSeriesInProgress() {
    const result = await getAllSeriesInProgress();
    if (!result.success) return { started: null, series: [] };
    // Série marcada como vista sai de Em Andamento, mesmo sem todos os episódios marcados
    const seen = new Set((session.user.history || []).map(h => h.id));
    const pending = result.series.filter(s => !seen.has(s.id));
    const series = await Promise.all(pending.map(async s => {
        try {
            const info = await tmdbGet(`/tv/${s.id}`, {}, { ttl: 3_600_000 });
            const allSeasons = await fetchAllSeasonsLocal(s.id, info.number_of_seasons || 0);
            const next = getNextEpisode(s.watchedKeys, allSeasons, s.id);
            if (!next) return null; // concluída: não aparece
            const totalEps = allSeasons.reduce((a, season) => a + season.episodes.length, 0);
            return {
                ...s,
                next,
                nextLabel: `T${String(next.season_number).padStart(2, '0')}E${String(next.episode_number).padStart(2, '0')}`,
                percent: calcProgressPercent(s.watchedKeys, allSeasons, s.id),
                remaining: totalEps - s.watchedKeys.size,
            };
        } catch { return null; }
    }));
    return { started: pending.length, series: series.filter(Boolean) };
}

export async function renderAndando(div, isStale = () => false) {
    div.innerHTML = '<div class="library-note">Carregando...</div>';

    const { started, series } = await loadSeriesInProgress();
    if (isStale()) return;
    if (!started) {
        const playIcon = ph('play-circle', { weight: 'duotone' });
        div.innerHTML = `
            <div class="empty-state grid-full">
                <div class="empty-state-icon">${playIcon}</div>
                <h3 class="empty-state-title">Nenhuma série em andamento</h3>
                <p class="empty-state-desc">Marque episódios como assistidos no modal de uma série para acompanhar seu progresso.</p>
            </div>`;
        return;
    }

    const cards = series.map(({ nextLabel, percent, remaining, ...s }) => {
            const poster = s.poster ? `${IMG_URL}${s.poster}` : null;
            const remainingLabel = `${remaining} ep. ${pluralize(remaining, 'restante', 'restantes')}`;

            return `
                <article class="up-next-card grid-full"
                   >
                    ${poster
                        ? `<img class="up-next-card__poster" src="${poster}" alt="" width="48" height="72" loading="lazy">`
                        : `<div class="up-next-card__poster-placeholder">${TV_ICON}</div>`
                    }
                    <div class="up-next-card__info">
                        <button type="button" class="up-next-card__title" data-action="carregarDetalhes" data-id="${s.id}" data-media="${s.type || 'tv'}" aria-label="Continuar ${escapeHtml(s.title)}, próximo ${nextLabel}">${escapeHtml(s.title)}</button>
                        <div class="up-next-card__episode">Próximo: ${nextLabel} · <span class="up-next-card__remaining">${remainingLabel}</span></div>
                        <div class="up-next-card__progress-wrap">
                            <div class="up-next-card__progress-bar" style="width:${percent}%"></div>
                        </div>
                    </div>
                    <button type="button" class="up-next-card__action" data-action="abrirEpisodios" data-id="${s.id}" data-media="${s.type || 'tv'}" aria-label="Episódios de ${escapeHtml(s.title)}">
                        Episódios
                    </button>
                </article>`;
    });

    if (cards.length === 0) {
        div.innerHTML = '<div class="library-note">Todas as séries foram concluídas!</div>';
        return;
    }
    div.innerHTML = cards.join('');
}

export function removeLibItem(key, id, btn) {
    if (!session.currentUser) return;
    const card = btn?.closest('.library-item');
    scheduleUndoable({
        message: key === 'vistos_obj' ? 'Removido de Já Assistidos.' : 'Removido de Quero Assistir.',
        apply: () => {
            const hadFocus = !!card?.contains(document.activeElement);
            pendingRemovals.add(`${key}:${id}`);
            if (card) card.hidden = true;
            renderLibrary(); // redesenha sem o item: atualiza a contagem "FILMES (n)"
            return hadFocus;
        },
        undo: async (refocus) => {
            pendingRemovals.delete(`${key}:${id}`);
            await renderLibrary();
            if (refocus) document.querySelector(`#library-content .library-item__open[data-id="${id}"]`)?.focus();
        },
        commit: async () => {
            await commitRemoveLibItem(key, id);
            pendingRemovals.delete(`${key}:${id}`);
        },
        focusAfter: () => document.querySelector('#library-content .library-item:not([hidden]) .library-item__open') || document.querySelector('[role="tab"][aria-controls="library-content"][aria-selected="true"]'),
    });
}

export async function commitRemoveLibItem(key, id) {
    if (isGuest()) {
        if (key === 'vistos_obj') {
            session.user.history = session.user.history.filter(i => i.id !== id);
            saveGuestHistory(session.user.history);
            await clearSeries(id); // igual à conta: série removida volta do zero
        } else {
            session.user.watchlist = (session.user.watchlist || []).filter(i => i.id !== id);
            saveGuestWatchlist(session.user.watchlist);
        }
        renderLibrary();
        return;
    }

    if (key === 'vistos_obj') {
        const result = await supabaseRemoveFromHistory(session.currentUserId, id);
        if (result.success) {
            session.user.history = session.user.history.filter(i => i.id !== id);
            // Limpar progresso de episódios junto — série removida = clean slate
            await clearSeries(id);
        }
    } else {
        await supabaseRemoveFromWatchlist(session.currentUserId, id);
    }

    renderLibrary();
}
