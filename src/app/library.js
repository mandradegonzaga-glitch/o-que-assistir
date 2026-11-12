// Biblioteca: Quero Assistir, Em Andamento, Já Assistidos e Minhas Listas (src/app/userLists.js)
import { ph } from '../ui/phosphor.js';
import { getAllSeriesInProgress } from './episodeStore.js';
import { addToHistory, addToWatchlist, inWatchlist, removeFromHistory, removeFromWatchlist } from './libraryStore.js';
import { tmdbGet } from '../api/tmdb.js';
import { getAllSeasons } from '../api/tmdbSeries.js';
import { checkAllBadges } from './badges.js';
import { grantXp, trackChallenge } from './progress.js';
import { renderListsTab } from './userLists.js';
import { reactionOf } from '../domain/reactions.js';
import { seriesUpNext } from '../domain/seriesProgress.js';
import { session, state } from '../state/appState.js';
import { isPendingRemoval, scheduleUndoable, showToast } from '../ui/feedback.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatRating, joinMeta, pluralize } from '../utils/format.js';
import { IMG_URL } from '../config/constants.js';
import { CLOSE_ICON, posterImg } from '../ui/icons.js';
import { TV_ICON } from '../ui/icons.js';
import { toLibraryItem } from '../domain/mediaItem.js';
import { emit, on } from '../state/events.js';
import { createWatchedEntry } from '../domain/history.js';
import { registerActions } from '../ui/actions.js';

// Só adiciona (nunca tira) e devolve quantos entraram. Usado pela lista do Match.
export async function addManyToWatchlist(titles) {
    if (!session.currentUser) return 0;
    const fresh = titles.filter(t => !inWatchlist(t.id)).map(t => toLibraryItem(t, state.type));
    let added = 0;
    for (const item of fresh) {
        if (await addToWatchlist(item)) added++;
    }
    if (added) emit('library:changed');
    return added;
}

export async function salvarHistorico(f) {
    if (!session.currentUser) return;

    if (session.user.history.find(h => h.id === f.id)) return;

    const entry = createWatchedEntry(f, f.media_type);

    if (await addToHistory(entry)) {
        showToast("Marcado como visto");
        grantXp('watched');
        trackChallenge('watched', entry);
        await checkAllBadges();
    } else {
        showToast("Erro ao salvar", "error");
    }
}

export async function toggleWatchlist(f) {
    if (!session.currentUser) return;

    if (inWatchlist(f.id)) {
        if (await removeFromWatchlist(f.id)) showToast("Removido da lista");
        else showToast("Não foi possível tirar da lista. Tente de novo.", "error");
    } else if (await addToWatchlist(toLibraryItem(f, state.type))) {
        showToast("Adicionado a Quero Assistir");
        trackChallenge('saved', f);
    } else {
        showToast("Não foi possível salvar. Tente de novo.", "error");
    }
    emit('library:changed');
}

// Cada chamada ganha um número: se outra começou enquanto esta esperava o banco, esta desiste
// (senão a resposta atrasada de uma aba antiga desenha por cima da aba atual)
let renderSeq = 0;

// Trocar de parte começa sem filtro e fora do modo de edição
let kindFilter = 'all';
let editing = false;
on('tab:changed', () => { kindFilter = 'all'; editing = false; });
on('library:changed', renderLibrary);
on('tab:changed', renderLibrary);

const KINDS = [
    { kind: 'movie', name: 'Filmes', match: i => i.type === 'movie' || !i.type },
    { kind: 'tv', name: 'Séries', match: i => i.type === 'tv' },
    { kind: 'dorama', name: 'Doramas', match: i => i.type === 'dorama' },
];

async function renderLibrary() {
    if (!session.currentUser) return;
    const seq = ++renderSeq;

    const div = document.getElementById('library-content');
    // "Editar" (mostrar os x de remover) só existe em Quero assistir e Já vistos
    div.classList.toggle('is-editable', state.tab === 'watchlist' || state.tab === 'vistos');
    div.classList.toggle('is-editing', editing);

    if (state.tab === 'listas') {
        renderListsTab(div);
        return;
    }

    if (state.tab === 'andando') {
        await renderAndando(div, () => seq !== renderSeq);
        return;
    }

    let list = state.tab === 'watchlist' ? session.user.watchlist || [] : session.user.history || [];
    const listKey = state.tab === 'watchlist' ? 'watchlist_obj' : 'vistos_obj';
    list = list.filter(i => !isPendingRemoval(`${listKey}:${i.id}`));

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
                <p class="empty-state-desc">${isWatchlist ? 'Comece adicionando filmes e séries que deseja assistir' : 'Marque filmes como assistidos para construir seu histórico'}</p>
                <button class="empty-state-cta" data-action="switchTabAndTop" data-arg="${isWatchlist ? 'vistos' : 'watchlist'}">
                    ${isWatchlist ? tvIcon : bookmarkBtn} ${isWatchlist ? 'Ver Assistidos' : 'Ver Lista'}
                </button>
            </div>
        `;
        return;
    }

    const key = state.tab === 'watchlist' ? 'watchlist_obj' : 'vistos_obj';
    const groups = KINDS.map(k => ({ ...k, items: list.filter(k.match) })).filter(g => g.items.length);
    const shown = groups.filter(g => kindFilter === 'all' || g.kind === kindFilter);
    div.innerHTML = libraryToolbar(groups) + (shown.length ? shown : groups)
        .map(g => libraryGroup(g.name, g.items, g.kind, key)).join('');
}

// Filtro por tipo (só quando há mais de um tipo na lista) e "Editar", que mostra os x de remover
function libraryToolbar(groups) {
    const pills = groups.length > 1
        ? [{ kind: 'all', name: 'Todos', items: groups.flatMap(g => g.items) }, ...groups].map(g =>
            `<button type="button" class="library-filter__pill" data-action="filtrarBiblioteca" data-arg="${g.kind}" aria-pressed="${kindFilter === g.kind}">${g.name} <span class="library-filter__count">${g.items.length}</span></button>`).join('')
        : '';
    return `<div class="library-toolbar grid-full">
        <div class="library-filter" role="group" aria-label="Mostrar">${pills}</div>
        <button type="button" class="library-edit" data-action="alternarEdicaoBiblioteca" aria-pressed="${editing}">${editing ? 'Concluir' : 'Editar'}</button>
    </div>`;
}

function libraryGroup(title, items, media, key) {
    if (items.length === 0) return '';
    const cards = items.map(f => {
        const reaction = key === 'vistos_obj' ? reactionOf(f.reaction) : null;
        const rating = f.rating ? formatRating(f.rating) : '';
        const name = escapeHtml([f.title || 'Abrir título', rating && `nota ${rating}`, reaction?.label].filter(Boolean).join(', '));
        const badge = reaction ? `<span class="title-reaction" aria-hidden="true">${reaction.emoji}</span>` : '';
        const ratingLine = rating ? `<span class="library-item__rating" aria-hidden="true">★ ${rating}</span>` : '';
        return `<div class="library-item"><button type="button" class="library-item__open" data-action="carregarDetalhes" data-id="${f.id}" data-media="${media}" aria-label="${name}">${posterImg(f.poster)}${badge}${ratingLine}</button><button type="button" class="remove-btn" data-action="removeLibItem" data-key="${key}" data-id="${f.id}" aria-label="Remover ${escapeHtml(f.title || 'título')}">${CLOSE_ICON}</button></div>`;
    });
    return `<div class="library-group-title">${joinMeta([title, String(items.length)])}</div>${cards.join('')}`;
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
            const allSeasons = await getAllSeasons(s.id, info.number_of_seasons || 0);
            const upNext = seriesUpNext(s.watchedKeys, allSeasons, s.id);
            return upNext && { ...s, ...upNext }; // concluída: não aparece
        } catch { return null; }
    }));
    return { started: pending.length, series: series.filter(Boolean) };
}

async function renderAndando(div, isStale = () => false) {
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
                        <div class="up-next-card__episode">${joinMeta([`Próximo: ${nextLabel}`, remainingLabel])}</div>
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
        div.innerHTML = '<div class="library-note">Todas as séries foram concluídas</div>';
        return;
    }
    div.innerHTML = cards.join('');
}

function removeLibItem(key, id, btn) {
    if (!session.currentUser) return;
    const card = btn?.closest('.library-item');
    scheduleUndoable({
        message: key === 'vistos_obj' ? 'Removido de Já Assistidos.' : 'Removido de Quero Assistir.',
        hide: `${key}:${id}`,
        apply: () => {
            const hadFocus = !!card?.contains(document.activeElement);
            if (card) card.hidden = true;
            emit('library:changed'); // redesenha sem o item: atualiza a contagem "Filmes · n"
            return hadFocus;
        },
        undo: async (refocus) => {
            await emit('library:changed');
            if (refocus) document.querySelector(`#library-content .library-item__open[data-id="${id}"]`)?.focus();
        },
        commit: () => commitRemoveLibItem(key, id),
        focusAfter: () => document.querySelector('#library-content .library-item:not([hidden]) .library-item__open') || document.querySelector('[role="tab"][aria-controls="library-content"][aria-selected="true"]'),
    });
}

async function commitRemoveLibItem(key, id) {
    const removed = key === 'vistos_obj'
        ? await removeFromHistory(id, { clearEpisodes: true })
        : await removeFromWatchlist(id);
    if (!removed) showToast('Não foi possível remover. O título continua na lista.', 'error');
}

registerActions({
    click: {
        removeLibItem: el => removeLibItem(el.dataset.key, Number(el.dataset.id), el),
        filtrarBiblioteca: el => { kindFilter = el.dataset.arg; renderLibrary(); },
        alternarEdicaoBiblioteca: () => { editing = !editing; renderLibrary(); },
    },
});
