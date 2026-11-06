// Link público das listas: ligar, mandar, desligar e abrir o link (?lista=<token>), mesmo sem conta.
// Banco: set_list_sharing e get_shared_list em database/user_lists.sql.
import { supabaseGetSharedList, supabaseSetListSharing } from '../api/supabase.js';
import { isShareToken, sharedListFrom } from '../domain/userLists.js';
import { session } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatCount, pluralize } from '../utils/format.js';
import { IMG_URL } from '../config/constants.js';
import { shareLink } from './match.js';
import { copyAsList, findList, getOpenListId, setLists, showUserList } from './userLists.js';
import { renderLibrary } from './library.js';

const PARAM = 'lista';
let shared = null; // lista aberta pelo link

const hasAccount = () => Boolean(session.currentUserId) && session.currentUser !== 'guest';
export const listLink = token => `${location.origin}${location.pathname}?${PARAM}=${token}`;

function updateList(listId, changes) {
    setLists((session.user.lists || []).map(l => (l.id === listId ? { ...l, ...changes } : l)));
}

export async function shareUserList() {
    const list = findList(getOpenListId());
    if (!list) return;
    if (!hasAccount()) {
        showToast('Crie uma conta para compartilhar listas por link.', 'warning');
        return;
    }
    let token = list.shareToken;
    if (!token) {
        const ok = await confirmDialog({
            title: 'Compartilhar por link?',
            message: 'Quem tiver o link vê o nome da lista, os títulos e o seu nome, mesmo sem conta, e pode copiar a lista. Você pode parar de compartilhar quando quiser.',
            confirmLabel: 'Criar link',
        });
        if (!ok) return;
        const result = await supabaseSetListSharing(list.id, true);
        if (!result.success) {
            showToast('Não foi possível criar o link. Tente de novo.', 'error');
            return;
        }
        token = result.token;
        updateList(list.id, { shareToken: token });
        await renderLibrary();
    }
    await shareLink(listLink(token), `${list.emoji} ${list.name}: minha lista no O Que Assistir. Dá uma olhada:`, list.name);
}

export async function stopSharingUserList() {
    const list = findList(getOpenListId());
    if (!list?.shareToken) return;
    const ok = await confirmDialog({
        title: 'Parar de compartilhar?',
        message: 'O link desta lista para de funcionar para todo mundo. Se compartilhar de novo, sai um link novo.',
        confirmLabel: 'Parar de compartilhar',
        danger: true,
    });
    if (!ok) return;
    const result = await supabaseSetListSharing(list.id, false);
    if (!result.success) {
        showToast('Não foi possível desligar o link. Tente de novo.', 'error');
        return;
    }
    updateList(list.id, { shareToken: null });
    showToast('O link desta lista não funciona mais.');
    await renderLibrary();
    document.querySelector('#library-content [data-action="shareUserList"]')?.focus();
}

// Chamado depois do login ou do "Entrar como convidado": a tela de entrada não pode ficar por cima
export async function openSharedListFromUrl() {
    const url = new URL(location.href);
    const token = url.searchParams.get(PARAM);
    if (!token || !session.currentUser) return;
    url.searchParams.delete(PARAM);
    history.replaceState(null, '', url);

    if (!isShareToken(token)) {
        showToast('Este link de lista está incompleto. Peça o link de novo.', 'error');
        return;
    }
    const result = await supabaseGetSharedList(token);
    if (!result.success) {
        showToast('Não foi possível abrir a lista agora. Tente de novo mais tarde.', 'error');
        return;
    }
    shared = sharedListFrom(result.list);
    if (!shared) {
        showToast('Esta lista não está mais compartilhada.', 'warning');
        return;
    }
    if (shared.isMine && findList(shared.listId)) {
        await showUserList(shared.listId); // o próprio link: abre a lista para editar
        return;
    }
    renderSharedList();
    document.getElementById('modal-shared-list').style.display = 'flex';
}

function renderSharedList() {
    const n = shared.items.length;
    document.getElementById('shared-list-title').innerHTML = `<span aria-hidden="true">${shared.emoji}</span> ${escapeHtml(shared.name)}`;
    document.getElementById('shared-list-owner').textContent =
        `${shared.owner ? `Lista de ${shared.owner}` : 'Lista compartilhada'} · ${n === 0 ? 'nenhum título' : `${formatCount(n)} ${pluralize(n, 'título', 'títulos')}`}`;
    document.getElementById('shared-list-items').innerHTML = n === 0
        ? '<p class="library-note grid-full">Esta lista ainda está vazia.</p>'
        : shared.items.map(i => `<div class="library-item">
            <button type="button" class="library-item__open" data-action="carregarDetalhes" data-id="${i.id}" data-media="${i.type}" aria-label="${escapeHtml(i.title)}">${i.poster
                ? `<img src="${IMG_URL + i.poster}" alt="" width="500" height="750" loading="lazy">`
                : `<span class="library-item__noposter">${escapeHtml(i.title)}</span>`}</button>
        </div>`).join('');
    document.getElementById('shared-list-copy').hidden = n === 0;
}

export async function copySharedList() {
    if (!shared) return;
    const btn = document.getElementById('shared-list-copy');
    if (btn.disabled) return;
    btn.disabled = true;
    try {
        const listId = await copyAsList(shared);
        if (!listId) return;
        document.getElementById('modal-shared-list').style.display = 'none';
        await showUserList(listId);
    } finally {
        btn.disabled = false;
    }
}
