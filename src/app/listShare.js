// Link público das listas: ligar, mandar, desligar e abrir o link (?lista=<token>), mesmo sem conta.
// Banco: set_list_sharing e get_shared_list em database/user_lists.sql.
import { supabaseGetSharedList, supabaseSetListSharing } from '../api/supabase.js';
import { isShareToken, sharedListFrom } from '../domain/userLists.js';
import { isAccount, session } from '../state/appState.js';
import { showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { listIcon } from '../ui/listIcons.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatCount, pluralize } from '../utils/format.js';
import { cardPoster, copyAsList, findList, getOpenListId, setLists, showUserList } from './userLists.js';
import { emit } from '../state/events.js';
import { appLink, setUrlParams, shareLink } from '../ui/share.js';
import { registerActions } from '../ui/actions.js';


const PARAM = 'lista';
let shared = null; // lista aberta pelo link

const listLink = token => appLink(PARAM, token);

function updateList(listId, changes) {
    setLists((session.user.lists || []).map(l => (l.id === listId ? { ...l, ...changes } : l)));
}

async function shareUserList() {
    const list = findList(getOpenListId());
    if (!list) return;
    if (!isAccount()) {
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
        await emit('library:changed');
    }
    await shareLink(listLink(token), `${list.emoji} ${list.name}: minha lista no O Que Assistir. Dá uma olhada:`, list.name);
}

async function stopSharingUserList() {
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
    await emit('library:changed');
    document.querySelector('#library-content [data-action="shareUserList"]')?.focus();
}

// Chamado depois do login ou do "Entrar como convidado": a tela de entrada não pode ficar por cima
export async function openSharedListFromUrl() {
    const token = new URLSearchParams(location.search).get(PARAM);
    if (!token || !session.currentUser) return;
    setUrlParams({ [PARAM]: null });

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
    document.getElementById('shared-list-title').innerHTML = `${listIcon(shared.emoji)} ${escapeHtml(shared.name)}`;
    document.getElementById('shared-list-owner').textContent =
        `${shared.owner ? `Lista de ${shared.owner}` : 'Lista compartilhada'} · ${n === 0 ? 'nenhum título' : `${formatCount(n)} ${pluralize(n, 'título', 'títulos')}`}`;
    document.getElementById('shared-list-items').innerHTML = n === 0
        ? '<p class="library-note grid-full">Esta lista ainda está vazia.</p>'
        : shared.items.map(i => `<div class="library-item">
            <button type="button" class="library-item__open" data-action="carregarDetalhes" data-id="${i.id}" data-media="${i.type}" aria-label="${escapeHtml(i.title)}">${cardPoster(i)}</button>
        </div>`).join('');
    document.getElementById('shared-list-copy').hidden = n === 0;
}

async function copySharedList() {
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

registerActions({
    click: {
        shareUserList,
        stopSharingUserList,
        copySharedList,
    },
});
