// Títulos ignorados ("Não tenho interesse")
import { supabaseAddToBlacklist, supabaseClearBlacklist, supabaseGetBlacklist, supabaseRemoveFromBlacklist } from '../api/supabase.js';
import { fecharModal } from './titleModal.js';
import { isAccount, session, state } from '../state/appState.js';
import { isPendingRemoval, scheduleUndoable, showToast } from '../ui/feedback.js';
import { confirmDialog } from '../ui/modals.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { CLOSE_ICON } from '../ui/icons.js';
import { getTitle, tmdbImage } from '../domain/mediaItem.js';
import { registerActions } from '../ui/actions.js';
import { getGuestBlacklistDetails, saveGuestBlacklist } from './guestLibrary.js';

// ================================================
// BLACKLIST (NÃO TENHO INTERESSE)
// ================================================


async function adicionarBlacklist() {
    const item = state.currentMovie;
    if (!item) return;

    if (session.blacklist.includes(item.id)) {
        showToast('Já está na sua lista de ignorados!', 'warning');
        return;
    }

    if (isAccount()) {
        if (!(await supabaseAddToBlacklist(session.currentUserId, item)).success) {
            showToast('Não foi possível ignorar este título. Tente de novo.', 'error');
            return;
        }
        session.blacklist.push(item.id);
    } else {
        session.blacklist.push(item.id);
        saveGuestBlacklist(session.blacklist, [
            ...getGuestBlacklistDetails(),
            { tmdb_id: item.id, title: getTitle(item), poster_path: item.poster_path },
        ]);
    }

    showToast('Adicionado à lista de ignorados. Não será mais sugerido!');
    fecharModal();
}

function removerBlacklist(tmdbId, btn) {
    const row = btn?.closest('.blacklist-item');
    const before = session.blacklist.slice();
    scheduleUndoable({
        message: 'Título voltará a ser sugerido.',
        hide: `blacklist:${tmdbId}`,
        apply: () => {
            const hadFocus = !!row?.contains(document.activeElement);
            session.blacklist = session.blacklist.filter(id => id !== tmdbId);
            if (row) row.hidden = true;
            return hadFocus;
        },
        undo: (refocus) => {
            session.blacklist = before;
            if (row?.isConnected) { row.hidden = false; if (refocus) row.querySelector('button')?.focus(); }
            else renderBlacklist();
        },
        commit: async () => {
            if (isAccount()) {
                if (!(await supabaseRemoveFromBlacklist(session.currentUserId, tmdbId)).success) {
                    session.blacklist = before;
                    showToast('Não foi possível voltar a sugerir este título. Tente de novo.', 'error');
                }
            } else {
                saveGuestBlacklist(session.blacklist, getGuestBlacklistDetails().filter(d => d.tmdb_id !== tmdbId));
            }
            renderBlacklist();
        },
        focusAfter: () => document.querySelector('.blacklist-item:not([hidden]) button') || document.getElementById('profile-title')?.closest('[role="dialog"]'),
    });
}

export async function renderBlacklist() {
    const container = document.getElementById('blacklist-container');
    const clearBtn = document.getElementById('btn-clear-blacklist');
    if (!container) return;

    if (session.blacklist.length === 0) {
        container.innerHTML = '<p class="text-tertiary text-center">Nenhum título ignorado</p>';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    let items;
    if (isAccount()) {
        const result = await supabaseGetBlacklist(session.currentUserId);
        items = result.blacklist || [];
    } else {
        items = getGuestBlacklistDetails();
    }
    items = items.filter(i => !isPendingRemoval(`blacklist:${i.tmdb_id}`));

    container.innerHTML = items.map(item => `
        <div class="blacklist-item">
            <img src="${tmdbImage(item.poster_path, 'w92')}" alt="" width="40" height="60" loading="lazy">
            <span>${escapeHtml(item.title)}</span>
            <button type="button" data-action="removerBlacklist" data-arg="${item.tmdb_id}" title="Remover" aria-label="Voltar a sugerir ${escapeHtml(item.title)}">${CLOSE_ICON}</button>
        </div>
    `).join('');

    if (clearBtn) clearBtn.style.display = 'block';
}

async function limparBlacklist() {
    if (!(await confirmDialog({ title: 'Limpar lista de ignorados', message: 'Os títulos voltarão a aparecer nos sorteios.', confirmLabel: 'Limpar', danger: true }))) return;

    if (isAccount()) {
        if (!(await supabaseClearBlacklist(session.currentUserId)).success) {
            showToast('Não foi possível limpar a lista de ignorados. Tente de novo.', 'error');
            return;
        }
    } else {
        saveGuestBlacklist([], []);
    }

    session.blacklist = [];
    renderBlacklist();
    showToast('Lista de ignorados limpa!');
}

registerActions({
    click: {
        adicionarBlacklist,
        limparBlacklist,
        removerBlacklist: el => removerBlacklist(Number(el.dataset.arg), el),
    },
});
