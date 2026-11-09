// Listas personalizadas: aba "Minhas Listas", "Salvar em uma lista" no título e a janela de criar/renomear.
// Regras em src/domain/userLists.js; banco em database/user_lists.sql. O convidado guarda no aparelho.
import { isAbortError, latestSignal, tmdbGet } from '../api/tmdb.js';
import {
    DEFAULT_EMOJI, LIST_EMOJIS, MAX_ITEMS, MAX_LISTS, cleanListName, hasItem, listNameError,
    availableTemplates, findListByName, moveItem, pickEmoji, toListItem,
} from '../domain/userLists.js';
import { COLLECTIONS, collectionById, collectionItems, collectionKind, collectionPath } from '../domain/collections.js';
import { isGuest, session, state } from '../state/appState.js';
import { isPendingRemoval, scheduleUndoable, showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { setDragReorder } from '../ui/dragReorder.js';
import { CLOSE_ICON, posterImg } from '../ui/icons.js';
import { listIcon, listIconInfo } from '../ui/listIcons.js';
import { ph } from '../ui/phosphor.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatCount, pluralize } from '../utils/format.js';
import {
    addTitlesToList, allLists, canCreateList, changeList, createList, deleteList, findList, listsUnavailable,
    renameList, saveListOrder, setTitleInList as storeTitleInList,
} from './listStore.js';

import { switchMode, switchTab } from '../ui/navigation.js';
import { getTitle } from '../domain/mediaItem.js';
import { DAY_MS } from '../utils/date.js';
import { emit, on } from '../state/events.js';
import { registerActions } from '../ui/actions.js';

let openListId = null;   // lista aberta na aba; null mostra todas
let openCollectionId = null; // coleção pronta aberta (src/domain/collections.js)
const collectionCache = new Map(); // id → títulos já buscados no TMDB (null: falhou)
const COLLECTION_TTL_MS = DAY_MS;
let reorderMode = false; // "Ordenar" ligado na lista aberta
const pendingOrder = new Map(); // listId → { timer, before }: a ordem é gravada um instante depois do último movimento
const ORDER_SAVE_MS = 600;
const editor = { listId: null, fromSave: false, emoji: DEFAULT_EMOJI };

// A próxima pessoa começa com todas as listas à vista, sem a lista ou a coleção de quem saiu aberta
on('session:ended', () => {
    openListId = null;
    openCollectionId = null;
    reorderMode = false;
});

export const getOpenListId = () => openListId;
const countLabel = n => (n === 0 ? 'Nenhum título' : `${formatCount(n)} ${pluralize(n, 'título', 'títulos')}`);
const removalKey = (listId, titleId) => `list:${listId}:${titleId}`;

// Põe ou tira o título e explica o que deu errado; devolve se ficou como pedido
async function setTitleInList(listId, item, include) {
    const result = await storeTitleInList(listId, item, include);
    if (result.full) showToast(`Essa lista já tem ${MAX_ITEMS} títulos, o máximo.`, 'error');
    else if (!result.success) showToast('Não foi possível mudar a lista. Verifique a conexão e tente de novo.', 'error');
    return result.success;
}

// ABA "MINHAS LISTAS"

// Cartão de título nas listas: sem pôster, o nome no lugar
export const cardPoster = item => (item.poster
    ? posterImg(item.poster)
    : `<span class="library-item__noposter">${escapeHtml(item.title)}</span>`);

export function renderListsTab(div) {
    if (listsUnavailable()) {
        div.innerHTML = '<p class="library-note grid-full">Não foi possível carregar suas listas agora. Tente de novo mais tarde.</p>';
        return;
    }
    const collection = openCollectionId ? collectionById(openCollectionId) : null;
    if (collection) {
        renderCollection(div, collection);
        return;
    }
    const open = openListId ? findList(openListId) : null;
    if (open) {
        renderOpenList(div, open);
        return;
    }
    openListId = null;

    const lists = allLists();
    if (lists.length === 0) {
        div.innerHTML = `
            <div class="empty-state grid-full">
                <div class="empty-state-icon">${ph('folder-open', { cls: 'empty-state-ph' })}</div>
                <h3 class="empty-state-title">Nenhuma lista ainda</h3>
                <p class="empty-state-desc">Junte títulos do seu jeito, como "Maratona de Halloween" ou "Filmes com a namorada". Abra um título e toque em "Salvar em uma lista", ou crie uma agora.</p>
                ${templateChips('createFromTemplate', 'Comece com uma:')}
                <button type="button" class="empty-state-cta" data-action="openListEditor" data-arg="library">+ Criar a minha</button>
            </div>
            ${collectionsSection()}`;
        return;
    }

    const cards = lists.map(l => {
        const posters = l.items.filter(i => i.poster).slice(-3).reverse()
            .map(i => posterImg(i.poster)).join('');
        return `<li><button type="button" class="list-card" data-action="openUserList" data-arg="${escapeHtml(l.id)}">
                ${listIcon(l.emoji, 'list-card__emoji')}
                <span class="list-card__text"><span class="list-card__name">${escapeHtml(l.name)}</span>
                <span class="list-card__count">${countLabel(l.items.length)}</span></span>
                <span class="list-card__posters" aria-hidden="true">${posters}</span>
            </button></li>`;
    }).join('');
    const canCreate = canCreateList();
    div.innerHTML = `<ul class="list-cards grid-full" aria-label="Suas listas">${cards}</ul>
        ${canCreate ? '<button type="button" class="btn-outline list-new grid-full" data-action="openListEditor" data-arg="library">+ Nova lista</button>' : ''}
        ${collectionsSection()}`;
}

// Modelos com um toque (aba vazia: cria a lista; janela "Nova lista": preenche nome e emoji)
function templateChips(action, label) {
    const templates = availableTemplates(allLists());
    if (templates.length === 0) return '';
    const chips = templates.map(t => `<li><button type="button" class="list-template" data-action="${action}" data-arg="${escapeHtml(t.name)}">${listIcon(t.emoji)} ${escapeHtml(t.name)}</button></li>`).join('');
    return `<p class="list-templates__label" id="templates-${action}">${label}</p><ul class="list-templates" aria-labelledby="templates-${action}">${chips}</ul>`;
}

function collectionsSection() {
    const cards = COLLECTIONS.map(c => `<li><button type="button" class="list-card list-card--collection" data-action="openCollection" data-arg="${c.id}">
            ${listIcon(c.emoji, 'list-card__emoji')}
            <span class="list-card__text"><span class="list-card__name">${escapeHtml(c.name)}</span>
            <span class="list-card__count">${collectionKind(c)}</span></span>
        </button></li>`).join('');
    return `<section class="collections grid-full" aria-labelledby="collections-title">
            <h3 id="collections-title" class="collections__title">Coleções prontas</h3>
            <p class="collections__hint">Escolhidas pelo app entre os títulos mais bem avaliados. Abra uma e copie para as suas listas.</p>
            <ul class="list-cards">${cards}</ul>
        </section>`;
}

function renderCollection(div, c) {
    const items = collectionCache.get(c.id);
    let body;
    if (items === undefined) body = '<p class="library-note grid-full">Carregando...</p>';
    else if (items === null) body = '<p class="library-note grid-full">Não foi possível carregar esta coleção. Verifique a conexão e tente de novo.</p>';
    else body = items.map(i => `<div class="library-item">
                <button type="button" class="library-item__open" data-action="carregarDetalhes" data-id="${i.id}" data-media="${i.type}" aria-label="${escapeHtml(i.title)}">${cardPoster(i)}</button>
            </div>`).join('');
    const ready = Array.isArray(items) && items.length > 0;
    div.innerHTML = `
        <div class="list-view__head grid-full">
            <button type="button" class="btn-clear-small" data-action="closeUserList"><span aria-hidden="true">←</span> Todas as listas</button>
            <h3 id="list-view-title" class="list-view__title" tabindex="-1">${listIcon(c.emoji)} ${escapeHtml(c.name)}</h3>
            <p class="list-view__count">${ready ? `Coleção pronta · ${countLabel(items.length)}` : 'Coleção pronta'}</p>
            <div class="list-view__actions">
                ${ready ? '<button type="button" class="btn-main btn-compact list-view__copy" data-action="copyCollection">Copiar para minhas listas</button>' : ''}
            </div>
        </div>
        ${body}`;
}

async function loadCollection(c) {
    if (collectionCache.get(c.id)) return;
    collectionCache.delete(c.id); // falhou antes: tenta de novo
    try {
        const data = await tmdbGet(collectionPath(c), c.params, { ttl: COLLECTION_TTL_MS, signal: latestSignal('collection') });
        collectionCache.set(c.id, collectionItems(c, data.results));
    } catch (e) {
        if (isAbortError(e)) return;
        console.error('Erro ao carregar coleção:', e);
        collectionCache.set(c.id, null);
    }
}

async function openCollection(id) {
    const c = collectionById(id);
    if (!c) return;
    openCollectionId = id;
    openListId = null;
    await emit('library:changed');
    document.getElementById('list-view-title')?.focus();
    await loadCollection(c);
    if (openCollectionId !== id || state.tab !== 'listas') return;
    const hadFocus = document.activeElement?.id === 'list-view-title';
    await emit('library:changed');
    if (hadFocus) document.getElementById('list-view-title')?.focus();
}

// Copia títulos como uma lista da pessoa (coleção pronta ou lista compartilhada por link).
// Já existe uma com o mesmo nome? Os títulos que faltam entram nela. Devolve o id da lista, ou null.
export async function copyAsList({ name, emoji, items }) {
    let list = findListByName(allLists(), name);
    const isNew = !list;
    if (!list) {
        const created = await createList({ name, emoji: pickEmoji(emoji) });
        if (!created.success) {
            showToast(created.limit ? `Você chegou ao limite de ${MAX_LISTS} listas.`
                : created.duplicate ? 'Você já tem uma lista com esse nome.' : 'Não foi possível copiar a lista. Tente de novo.', 'error');
            return null;
        }
        list = findList(created.id);
    }
    const { success, added } = await addTitlesToList(list.id, items);
    if (!success) {
        showToast('A lista foi criada, mas os títulos não entraram. Tente copiar de novo.', 'error');
        return null;
    }
    let message;
    if (added.length === 0) message = `Todos já estavam em "${list.name}".`;
    else if (isNew) message = `Copiada para as suas listas como "${list.name}".`;
    else message = `${countLabel(added.length)} ${pluralize(added.length, 'entrou', 'entraram')} em "${list.name}".`;
    showToast(message);
    return list.id;
}

async function copyCollection() {
    const c = collectionById(openCollectionId);
    const items = c && collectionCache.get(c.id);
    if (!Array.isArray(items) || items.length === 0) return;
    const btn = document.querySelector('[data-action="copyCollection"]');
    if (btn?.disabled) return;
    if (btn) btn.disabled = true;
    try {
        const listId = await copyAsList({ name: c.name, emoji: c.emoji, items });
        if (listId) await showUserList(listId);
    } finally {
        if (btn?.isConnected) btn.disabled = false;
    }
}

// Mostra uma lista da pessoa na aba "Minhas Listas" (vindo de outra tela ou de um link)
export async function showUserList(listId) {
    openCollectionId = null;
    openListId = listId;
    reorderMode = false;
    switchMode('library'); // a lista fica na tela da Biblioteca
    if (state.tab !== 'listas') switchTab('listas'); // troca a aba e já desenha
    await emit('library:changed');
    const title = document.getElementById('list-view-title');
    title?.scrollIntoView({ block: 'center' });
    title?.focus({ preventScroll: true });
}

async function createFromTemplate(name) {
    const t = availableTemplates(allLists()).find(x => x.name === name);
    if (!t) return;
    const result = await createList(t);
    if (!result.success) {
        showToast(result.limit ? `Você chegou ao limite de ${MAX_LISTS} listas.` : 'Não foi possível criar a lista. Tente de novo.', 'error');
        return;
    }
    showToast(`Lista "${t.name}" criada.`);
    await emit('library:changed');
    focusListCard(result.id);
}

function useListTemplate(name) {
    const t = availableTemplates(allLists()).find(x => x.name === name);
    if (!t) return;
    document.getElementById('list-name').value = t.name;
    pickListEmoji(t.emoji);
    showNameError(null);
    document.getElementById('list-edit-save').focus();
}

function renderOpenList(div, list) {
    const items = list.items.filter(i => !isPendingRemoval(removalKey(list.id, i.id)));
    const ordering = reorderMode && items.length > 1;
    const cards = items.map((i, index) => (ordering ? `<div class="library-item is-reorderable" data-reorder-id="${i.id}">
            ${cardPoster(i)}
            <span class="reorder__handle" aria-hidden="true" title="Arraste para mudar a ordem">⠿ Arrastar</span>
            <span class="reorder__buttons">
                <button type="button" class="reorder__btn" data-action="moveUserListItem" data-id="${i.id}" data-arg="-1" aria-label="Mover ${escapeHtml(i.title)} para antes" ${index === 0 ? 'disabled' : ''}>◀</button>
                <span class="reorder__pos" aria-hidden="true">${index + 1}</span>
                <button type="button" class="reorder__btn" data-action="moveUserListItem" data-id="${i.id}" data-arg="1" aria-label="Mover ${escapeHtml(i.title)} para depois" ${index === items.length - 1 ? 'disabled' : ''}>▶</button>
            </span>
        </div>` : `<div class="library-item">
            <button type="button" class="library-item__open" data-action="carregarDetalhes" data-id="${i.id}" data-media="${i.type}" aria-label="${escapeHtml(i.title)}">${cardPoster(i)}</button>
            <button type="button" class="remove-btn" data-action="removeFromUserList" data-id="${i.id}" aria-label="Tirar ${escapeHtml(i.title)} da lista">${CLOSE_ICON}</button>
        </div>`)).join('');
    const shared = !isGuest() && list.shareToken;
    div.innerHTML = `
        <div class="list-view__head grid-full">
            <button type="button" class="btn-clear-small" data-action="closeUserList"><span aria-hidden="true">←</span> Todas as listas</button>
            <h3 id="list-view-title" class="list-view__title" tabindex="-1">${listIcon(list.emoji)} ${escapeHtml(list.name)}</h3>
            <p class="list-view__count">${countLabel(items.length)}${shared ? ` · <span class="list-view__shared">${ph('link', { weight: 'bold' })} Compartilhada por link</span>` : ''}</p>
            <div class="list-view__actions">
                ${items.length > 1 ? `<button type="button" class="btn-clear-small${ordering ? ' is-on' : ''}" data-action="toggleListReorder" aria-pressed="${ordering}">${ordering ? 'Pronto' : 'Ordenar'}</button>` : ''}
                <button type="button" class="btn-clear-small" data-action="shareUserList">Compartilhar</button>
                ${shared ? '<button type="button" class="btn-clear-small" data-action="stopSharingUserList">Parar de compartilhar</button>' : ''}
                <button type="button" class="btn-clear-small" data-action="openListEditor" data-arg="rename">Renomear</button>
                <button type="button" class="btn-clear-small" data-action="deleteUserList">Apagar lista</button>
            </div>
            ${ordering ? '<p class="list-view__hint">Arraste pela alça ⠿ ou use ◀ ▶. A ordem é salva sozinha.</p>' : ''}
            <p id="list-order-status" class="sr-only" aria-live="polite"></p>
        </div>
        ${cards || '<p class="library-note grid-full">Lista vazia. Abra um título e toque em "Salvar em uma lista".</p>'}`;
    setDragReorder(div, ordering ? {
        itemSelector: '.library-item[data-reorder-id]',
        handleSelector: '.reorder__handle',
        onDrop: (from, to) => applyOrder(list.id, from, to),
    } : null);
}

// ORDEM

async function toggleListReorder() {
    reorderMode = !reorderMode;
    await emit('library:changed');
    document.querySelector('#library-content [data-action="toggleListReorder"]')?.focus();
}

function moveUserListItem(titleId, delta) {
    const list = findList(openListId);
    const from = list ? list.items.findIndex(i => i.id === titleId) : -1;
    if (from === -1) return;
    applyOrder(list.id, from, from + delta, { refocus: delta < 0 ? -1 : 1 });
}

async function applyOrder(listId, from, to, { refocus = 0 } = {}) {
    const list = findList(listId);
    if (!list) return;
    const moved = moveItem(list, from, to);
    if (moved === list) return;
    if (!pendingOrder.has(listId)) pendingOrder.set(listId, { before: list.items });
    changeList(listId, { items: moved.items });
    const item = moved.items[to];
    await emit('library:changed');
    const status = document.getElementById('list-order-status');
    if (status) status.textContent = `${item.title} agora é o ${to + 1}º de ${moved.items.length}.`;
    if (refocus) {
        // O foco fica no mesmo botão do título que andou; na ponta, passa para o outro
        const pick = dir => document.querySelector(`#library-content .reorder__btn[data-id="${item.id}"][data-arg="${dir}"]:not([disabled])`);
        (pick(refocus) || pick(-refocus))?.focus();
    }
    scheduleOrderSave(listId);
}

function scheduleOrderSave(listId) {
    const entry = pendingOrder.get(listId);
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => saveOrder(listId), ORDER_SAVE_MS);
}

async function saveOrder(listId) {
    const entry = pendingOrder.get(listId);
    pendingOrder.delete(listId);
    const list = findList(listId);
    if (!entry || !list) return;
    const result = await saveListOrder(listId);
    if (result.success) return;
    showToast('Não foi possível salvar a ordem. Verifique a conexão e tente de novo.', 'error');
    // Volta para a ordem que estava no banco, mantendo títulos que entraram ou saíram nesse meio-tempo
    const now = findList(listId);
    if (!now) return;
    const ids = new Set(now.items.map(i => i.id));
    const restored = [...entry.before.filter(i => ids.has(i.id)), ...now.items.filter(i => !entry.before.some(b => b.id === i.id))];
    changeList(listId, { items: restored });
    if (state.tab === 'listas' && openListId === listId) emit('library:changed');
}

async function openUserList(id) {
    if (!findList(id)) return;
    openListId = id;
    openCollectionId = null;
    reorderMode = false;
    await emit('library:changed');
    document.getElementById('list-view-title')?.focus();
}

async function closeUserList() {
    const id = openListId || openCollectionId;
    openListId = null;
    openCollectionId = null;
    reorderMode = false;
    await emit('library:changed');
    focusListCard(id);
}

function focusListCard(id) {
    const card = [...document.querySelectorAll('#library-content .list-card')].find(el => el.dataset.arg === id);
    (card || document.querySelector('#library-content .list-card:not(.list-card--collection)') || document.getElementById('tab-listas'))?.focus();
}

function removeFromUserList(titleId, btn) {
    const listId = openListId;
    const item = findList(listId)?.items.find(i => i.id === titleId);
    if (!item) return;
    scheduleUndoable({
        message: 'Tirado da lista.',
        hide: removalKey(listId, titleId),
        apply: () => {
            const hadFocus = !!btn?.closest('.library-item')?.contains(document.activeElement);
            emit('library:changed');
            return hadFocus;
        },
        undo: async (refocus) => {
            await emit('library:changed');
            if (refocus) document.querySelector(`#library-content .library-item__open[data-id="${titleId}"]`)?.focus();
        },
        commit: () => setTitleInList(listId, item, false),
        after: () => state.tab === 'listas' && emit('library:changed'),
        focusAfter: () => document.querySelector('#library-content .library-item__open') || document.getElementById('list-view-title'),
    });
}

async function deleteUserList() {
    const list = findList(openListId);
    if (!list) return;
    const n = list.items.length;
    const ok = await confirmDialog({
        title: `Apagar "${list.name}"?`,
        message: n > 0
            ? `${n === 1 ? 'O título sai' : `Os ${formatCount(n)} títulos saem`} só desta lista: ${n === 1 ? 'continua' : 'continuam'} em "Quero Assistir", "Já assistidos" e nas outras listas.`
            : 'A lista está vazia.',
        confirmLabel: 'Apagar lista',
        danger: true,
    });
    if (!ok) return;
    const result = await deleteList(list.id);
    if (!result.success) {
        showToast('Não foi possível apagar a lista. Tente de novo.', 'error');
        return;
    }
    openListId = null;
    showToast(`Lista "${list.name}" apagada.`);
    await emit('library:changed');
    focusListCard(null);
}

// "SALVAR EM UMA LISTA" (tela do título)

on('library:changed', () => session.currentUser && updateSaveListButton());
on('title:opened', updateSaveListButton);

function updateSaveListButton() {
    const label = document.getElementById('btn-salvar-lista-label');
    const movie = state.currentMovie;
    if (!label || !movie) return;
    const n = allLists().filter(l => hasItem(l, movie.id)).length;
    label.textContent = n > 0 ? `Em ${formatCount(n)} ${pluralize(n, 'lista', 'listas')}` : 'Salvar em uma lista';
}

function renderSaveOptions() {
    const movie = state.currentMovie;
    const lists = allLists();
    document.getElementById('save-list-subtitle').textContent = `Onde guardar "${getTitle(movie)}"? Pode marcar mais de uma.`;
    document.getElementById('save-list-options').innerHTML = lists.map(l => `
        <label class="provider-choice save-lists__option">
            <input type="checkbox" data-change="toggleTitleInList" value="${escapeHtml(l.id)}" ${hasItem(l, movie.id) ? 'checked' : ''}>
            ${listIcon(l.emoji, 'save-lists__emoji')}
            <span class="save-lists__name">${escapeHtml(l.name)}</span>
            <span class="save-lists__count">${countLabel(l.items.length)}</span>
        </label>`).join('');
    document.getElementById('save-list-empty').hidden = lists.length > 0;
}

function openSaveToList() {
    if (!state.currentMovie || !session.currentUser) return;
    if (listsUnavailable()) {
        showToast('As listas não estão disponíveis agora. Tente de novo mais tarde.', 'error');
        return;
    }
    document.getElementById('save-list-status').textContent = '';
    renderSaveOptions();
    document.getElementById('modal-save-list').style.display = 'flex';
}

async function toggleTitleInList(input) {
    const movie = state.currentMovie;
    const list = findList(input.value);
    if (!movie || !list) return;
    const include = input.checked;
    const ok = await setTitleInList(list.id, toListItem(movie, state.type), include);
    const now = findList(list.id);
    // Vale o que ficou guardado: dois toques rápidos ou uma falha não deixam a caixa mentindo
    input.checked = !!now && hasItem(now, movie.id);
    if (ok) {
        document.getElementById('save-list-status').textContent = include ? `Salvo em ${list.name}.` : `Tirado de ${list.name}.`;
        const count = input.closest('label')?.querySelector('.save-lists__count');
        if (count && now) count.textContent = countLabel(now.items.length);
    }
    updateSaveListButton();
    if (state.tab === 'listas') emit('library:changed');
}

// CRIAR E RENOMEAR

function renderEmojiPicker() {
    document.getElementById('list-emoji').innerHTML = LIST_EMOJIS.map(e => {
        const on = e === editor.emoji;
        return `<button type="button" class="emoji-picker__option" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-action="pickListEmoji" data-arg="${e}" aria-label="${listIconInfo(e).label}">${listIcon(e)}</button>`;
    }).join('');
}

function pickListEmoji(emoji) {
    editor.emoji = pickEmoji(emoji);
    document.querySelectorAll('#list-emoji .emoji-picker__option').forEach(el => {
        const on = el.dataset.arg === editor.emoji;
        el.setAttribute('aria-checked', String(on));
        el.tabIndex = on ? 0 : -1;
    });
}

function showNameError(message) {
    const input = document.getElementById('list-name');
    const error = document.getElementById('list-name-error');
    error.textContent = message || '';
    error.hidden = !message;
    if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
    } else {
        input.removeAttribute('aria-invalid');
    }
}

// mode: 'library' (aba), 'save' (janela "Salvar em lista": já guarda o título na lista nova) ou 'rename'
function openListEditor(mode) {
    const list = mode === 'rename' ? findList(openListId) : null;
    if (mode === 'rename' && !list) return;
    if (!list && !canCreateList()) {
        showToast(`Você chegou ao limite de ${MAX_LISTS} listas.`, 'error');
        return;
    }
    editor.listId = list?.id ?? null;
    editor.fromSave = mode === 'save';
    editor.emoji = list?.emoji || DEFAULT_EMOJI;

    document.getElementById('list-edit-title').textContent = list ? 'Renomear lista' : 'Nova lista';
    document.getElementById('list-edit-save').textContent = list ? 'Salvar' : (editor.fromSave ? 'Criar e salvar' : 'Criar lista');
    const input = document.getElementById('list-name');
    input.value = list?.name || '';
    showNameError(null);
    renderEmojiPicker();
    document.getElementById('list-templates').innerHTML = list ? '' : templateChips('useListTemplate', 'Ou use um modelo:');
    document.getElementById('modal-list-edit').style.display = 'flex';
    setTimeout(() => input.focus(), 0);
}

async function saveListEditor() {
    const saveBtn = document.getElementById('list-edit-save');
    if (saveBtn.disabled) return;
    const name = cleanListName(document.getElementById('list-name').value);
    const error = listNameError(name, allLists(), editor.listId);
    if (error) {
        showNameError(error);
        return;
    }
    const { listId, fromSave, emoji } = editor;
    saveBtn.disabled = true;
    let id = listId;
    try {
        if (listId) {
            const result = await renameList(listId, { name, emoji });
            if (!result.success) {
                if (result.duplicate) showNameError('Você já tem uma lista com esse nome.');
                else showToast('Não foi possível renomear a lista. Tente de novo.', 'error');
                return;
            }
        } else {
            const result = await createList({ name, emoji });
            if (!result.success) {
                if (result.duplicate) showNameError('Você já tem uma lista com esse nome.');
                else showToast('Não foi possível criar a lista. Tente de novo.', 'error');
                return;
            }
            id = result.id;
            if (fromSave && state.currentMovie) await setTitleInList(id, toListItem(state.currentMovie, state.type), true);
        }
    } finally {
        saveBtn.disabled = false;
    }

    document.getElementById('modal-list-edit').style.display = 'none';
    if (fromSave) {
        renderSaveOptions();
        updateSaveListButton();
        const saved = findList(id) && state.currentMovie && hasItem(findList(id), state.currentMovie.id);
        document.getElementById('save-list-status').textContent = saved ? `Salvo em ${name}.` : '';
        showToast(saved ? `Lista "${name}" criada, com o título.` : `Lista "${name}" criada.`);
    } else {
        showToast(listId ? 'Lista renomeada.' : `Lista "${name}" criada.`);
    }
    if (state.tab !== 'listas') return;
    await emit('library:changed');
    if (fromSave) return;
    if (listId) document.getElementById('list-view-title')?.focus();
    else focusListCard(id);
}

registerActions({
    click: {
        openSaveToList,
        openListEditor: el => openListEditor(el.dataset.arg),
        saveListEditor,
        pickListEmoji: el => pickListEmoji(el.dataset.arg),
        openUserList: el => openUserList(el.dataset.arg),
        closeUserList,
        deleteUserList,
        openCollection: el => openCollection(el.dataset.arg),
        toggleListReorder,
        moveUserListItem: el => moveUserListItem(Number(el.dataset.id), Number(el.dataset.arg)),
        copyCollection,
        createFromTemplate: el => createFromTemplate(el.dataset.arg),
        useListTemplate: el => useListTemplate(el.dataset.arg),
        removeFromUserList: el => removeFromUserList(Number(el.dataset.id), el),
    },
    change: {
        toggleTitleInList,
    },
    enter: {
        saveListEditor,
    },
});
